import { User } from "../../models/index.js";
import { Op } from "sequelize";
import bcrypt from "bcrypt";
import gradeLevelEnum from "../../util/enum/gradeLevelEnum.js";
import { createAndEmailVerificationLink, getPendingEmailForUser } from "./emailVerification.service.js";

class StudentService {
  // Route handler methods with complete HTTP response logic
  async handleGetAllStudents(req, res) {
    const { page, limit, active, gradeLevel, agencyId } = req.query;
    const gradeLevels = Array.isArray(gradeLevel)
      ? gradeLevel
      : gradeLevel
        ? [gradeLevel]
        : [];
    if (gradeLevels.length > 0) {
      const invalidLevels = gradeLevels.filter(
        (level) => !gradeLevelEnum.isValidLevel(level)
      );
      if (invalidLevels.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid grade levels: ${invalidLevels.join(", ")}`,
        });
      }
    }
    const result = await this.getStudents({
      page,
      limit,
      active,
      gradeLevels,
      agencyId,
    });

    // Only return student-relevant fields
    const data = result.rows.map((user) => {
      const { password, role, hourlyRate, aboutMe, education, ...student } =
        user.toJSON();
      return student;
    });

    // Only include pagination if page and limit are present
    let pagination = undefined;
    if (page && limit) {
      pagination = {
        total: result.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(result.count / limit),
      };
    }

    res.status(200).json({
      data,
      ...(pagination ? { pagination } : {}),
    });
  }

  async handleGetStudentById(req, res) {
    const { id } = req.params;
    const student = await this.getStudentById(id);

    // expose pendingEmail so the app can show the new email immediately => for UI/UX purposes
    const pendingEmail = await getPendingEmailForUser(student.id);

    const {
      password,
      role,
      hourlyRate,
      aboutMe,
      education,
      ...studentResponse
    } = student.toJSON();

    res.status(200).json({
      ...studentResponse,
      pendingEmail,
    });
  }

  async handleCreateStudent(req, res) {
    const studentData = req.body;
    const newStudent = await this.createStudent(studentData);
    const {
      password,
      role,
      hourlyRate,
      aboutMe,
      education,
      ...studentResponse
    } = newStudent.toJSON();

    res.status(201).json(studentResponse);

    // user is created with isActive=false (model default), then send verification email
    createAndEmailVerificationLink({ user: newStudent, email: newStudent.email }).catch((err) =>
      console.error("Failed to send verification email:", err)
    );
  }

  async handleUpdateStudent(req, res) {
    const { id } = req.params;
    const updateData = req.body;
    if (updateData.password) {
      return res.status(400).json({
        success: false,
        message: "Use the password change endpoint to update passwords",
      });
    }
    const updatedStudent = await this.updateStudent(id, updateData);
    const {
      password,
      role,
      hourlyRate,
      aboutMe,
      education,
      ...studentResponse
    } = updatedStudent.toJSON();
    res.status(200).json(studentResponse);
  }

  async handleChangePassword(req, res) {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    await this.changePassword(id, currentPassword, newPassword);

    res.sendStatus(200);
  }

  async handleDeleteStudent(req, res) {
    const { id } = req.params;
    await this.deleteStudent(id);

    res.sendStatus(200);
  }

  // Business logic methods
  async createStudent(studentData) {
    // Check if email already exists
    const existingUser = await User.findOne({
      where: { email: studentData.email },
    });
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Check if email already exists in Agency table
    const existingAgency = await Agency.findOne({ where: { email: studentData.email } });
    if (existingAgency) {
        throw new Error('Agency with this email already exists');
    }
    return await User.create({ ...studentData, role: "student" });
  }

  async getStudents(options = {}) {
    const { page, limit, gradeLevels = [], active, agencyId } = options;
    const where = { role: "student" };
    if (gradeLevels.length > 0) {
      if (gradeLevels.length === 1) {
        where.gradeLevel = gradeLevels[0];
      } else {
        where.gradeLevel = {
          [Op.in]: gradeLevels,
        };
      }
    }
    if (active !== undefined) {
      where.isActive = active === "true" || active === true;
    }
    if (agencyId !== undefined) {
      where.agencyId = agencyId;
    }
    const queryOptions = {
      attributes: { exclude: ["password"] },
      where,
      order: [["createdAt", "DESC"]],
    };
    if (page && limit) {
      queryOptions.limit = parseInt(limit);
      queryOptions.offset = (parseInt(page) - 1) * parseInt(limit);
    }
    return await User.findAndCountAll(queryOptions);
  }

  async getStudentById(id) {
    const student = await User.findOne({ where: { id, role: "student" } });
    if (!student) {
      throw new Error("Student not found");
    }
    return student;
  }

  async updateStudent(id, updateData) {
    const student = await this.getStudentById(id);

    // If no email change, behave exactly as before.
    if (!updateData.email || updateData.email === student.email) {
      return await student.update(updateData);
    }

    // Email change: enforce uniqueness first
    const existingUser = await User.findOne({ where: { email: updateData.email } });
    if (existingUser && existingUser.id !== id) {
      throw new Error("Email already exists for another user");
    }

    // Email change flow:
    // 1) mark the account inactive
    student.isActive = false;
    await student.save();

    // 2) send verification link to the NEW email
    await createAndEmailVerificationLink({ user: student, email: updateData.email });

    // 3) apply any other updates EXCEPT email
    const { email, ...rest } = updateData;
    return await student.update(rest);
  }

  async deleteStudent(id) {
    const student = await this.getStudentById(id);
    await student.destroy();
  }

  async changePassword(studentId, currentPassword, newPassword) {
    const student = await this.getStudentById(studentId);
    const isValidCurrentPassword = await bcrypt.compare(
      currentPassword,
      student.password
    );
    if (!isValidCurrentPassword) {
      throw new Error("Current password is incorrect");
    }
    return await student.update({ password: newPassword });
  }
}

export default StudentService;
