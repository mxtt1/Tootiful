import { Notification, User, Lesson, Subject, StudentLesson, Location, Agency } from "../../models/index.js";
import { Op } from "sequelize";
import { getNextGradeLevel, canProgressToNextGrade } from "../../util/enum/gradeProgressionEnum.js";
import sequelize from "../../config/database.js";

class NotificationService {

  // Route handler methods with complete HTTP response logic
  async handleGetUserNotifications(req, res) {
    const userId = req.user.userId;
    const { limit, offset, unreadOnly } = req.query;
    
    const notifications = await this.getUserNotifications(userId, {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
      unreadOnly: unreadOnly === 'true'
    });

    res.status(200).json({
      success: true,
      data: notifications
    });
  }

  async handleGetNextGradeOptions(req, res) {
    const { lessonId } = req.params;
    
    try {
        const currentLesson = await Lesson.findByPk(lessonId, {
            include: [{
                model: Subject,
                as: "subject",
                attributes: ["id", "name", "gradeLevel"]
            }]
        });

        if (!currentLesson) {
            return res.status(404).json({ success: false, message: "Lesson not found" });
        }

        // Use the same logic from NotificationService to find next grade lessons
        const nextGradeLevel = this.getNextGradeLevel(currentLesson.subject.gradeLevel);
        
        // ✅ MODIFIED: Instead of returning error, return success with empty array
        if (!nextGradeLevel) {
            return res.status(200).json({ 
                success: true, 
                data: {
                    availableNextGradeLessons: []
                }
            });
        }

        const nextGradeSubject = await Subject.findOne({
            where: {
                name: currentLesson.subject.name,
                gradeLevel: nextGradeLevel,
                isActive: true
            }
        });

        // ✅ MODIFIED: Instead of returning error, return success with empty array
        if (!nextGradeSubject) {
            return res.status(200).json({ 
                success: true, 
                data: {
                    availableNextGradeLessons: []
                }
            });
        }

        const nextGradeLessons = await Lesson.findAll({
            where: {
                subjectId: nextGradeSubject.id,
                agencyId: currentLesson.agencyId,
                isActive: true,
                currentCap: { [Op.lt]: sequelize.col('totalCap') }
            },
            include: [
                {
                    model: Subject,
                    as: "subject",
                    attributes: ["id", "name", "gradeLevel"]
                },
                {
                    model: Location,
                    as: "location",
                    attributes: ["id", "address"]
                },
                {
                    model: User,
                    as: "tutor",
                    attributes: ["id", "firstName", "lastName"]
                }
            ]
        });

        res.status(200).json({
            success: true,
            data: {
                availableNextGradeLessons: nextGradeLessons.map(lesson => ({
                    id: lesson.id,
                    title: lesson.title,
                    dayOfWeek: lesson.dayOfWeek,
                    timeSlot: `${lesson.startTime} - ${lesson.endTime}`,
                    location: lesson.location?.address,
                    tutor: lesson.tutor ? `${lesson.tutor.firstName} ${lesson.tutor.lastName}` : 'Not assigned',
                    availableSpots: lesson.totalCap - lesson.currentCap
                }))
            }
        });

    } catch (error) {
        console.error("Error getting next grade options:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to get next grade options" 
        });
    }
  }

  async handleGetNotificationStats(req, res) {
    const userId = req.user.userId;
    const stats = await this.getNotificationStats(userId);

    res.status(200).json({
      success: true,
      data: stats
    });
  }
  

  async handleSendGradeProgressionNotifications(req, res) {
    const { lessonId } = req.params;
    const { selectedLessonIds, customMessage } = req.body; 
    
    const result = await this.sendGradeProgressionNotifications(lessonId, selectedLessonIds, customMessage);    
    res.status(200).json({
      success: true,
      message: `Grade progression notifications sent to ${result.notifiedStudents} students`,
      data: result
    });
  }

  async handleMarkAsRead(req, res) {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const notification = await this.markAsRead(id, userId);
    
    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification
    });
  }

  async handleMarkAllAsRead(req, res) {
    const userId = req.user.userId;
    const affectedCount = await this.markAllAsRead(userId);
    
    res.status(200).json({
      success: true,
      message: `Marked ${affectedCount} notifications as read`,
      data: { affectedCount }
    });
  }

  async handleDeleteNotification(req, res) {
    const { id } = req.params;
    const userId = req.user.userId;
    
    await this.deleteNotification(id, userId);
    
    res.status(200).json({
      success: true,
      message: "Notification deleted successfully"
    });
  }

  // Business logic methods
  async sendGradeProgressionNotifications(lessonId, selectedLessonIds = [], customMessage = null) {
    const transaction = await sequelize.transaction();
    try {
      console.log(`Sending grade progression notifications for lesson: ${lessonId}`);
      
      // 1. Get the current lesson with subject and enrolled students
      const currentLesson = await Lesson.findByPk(lessonId, {
        include: [
          {
            model: Subject,
            as: "subject",
            attributes: ["id", "name", "gradeLevel", "category"]
          },
          {
            model: StudentLesson,
            as: "enrollments",
            include: [{
              model: User,
              as: "student",
              attributes: ["id", "firstName", "lastName", "email", "gradeLevel"]
            }]
          },
          {
            model: Agency,
            as: "agency",
            attributes: ["id", "name"]
          }
        ],
        transaction
      });

      if (!currentLesson) {
        throw new Error("Lesson not found");
      }

      if (!currentLesson.subject) {
        throw new Error("Lesson subject not found");
      }

      // 2. Determine the next grade level using your actual enum
      const nextGradeLevel = this.getNextGradeLevel(currentLesson.subject.gradeLevel);
      if (!nextGradeLevel) {
        throw new Error(`No next grade level available for ${currentLesson.subject.gradeLevel}`);
      }

      console.log(`Current grade: ${currentLesson.subject.gradeLevel}, Next grade: ${nextGradeLevel}`);

      // 3. Find the next grade subject
      const nextGradeSubject = await Subject.findOne({
        where: {
          name: currentLesson.subject.name,
          gradeLevel: nextGradeLevel,
          isActive: true
        },
        transaction
      });

      if (!nextGradeSubject) {
        throw new Error(`No ${nextGradeLevel} level found for subject ${currentLesson.subject.name}`);
      }

      // 4. Find available lessons for the next grade subject
      let nextGradeLessons;
      
      if (selectedLessonIds && selectedLessonIds.length > 0) {
          // Agency selected specific lessons
          console.log(`Agency selected specific lessons: ${selectedLessonIds.join(', ')}`);
          
          nextGradeLessons = await Lesson.findAll({
              where: {
                  id: { [Op.in]: selectedLessonIds },
                  subjectId: nextGradeSubject.id,
                  agencyId: currentLesson.agencyId,
                  isActive: true,
                  currentCap: { [Op.lt]: sequelize.col('totalCap') }
              },
              include: [
                  {
                      model: Subject,
                      as: "subject",
                      attributes: ["id", "name", "gradeLevel"]
                  },
                  {
                      model: Location,
                      as: "location",
                      attributes: ["id", "address"]
                  },
                  {
                      model: User,
                      as: "tutor",
                      attributes: ["id", "firstName", "lastName"]
                  }
              ],
              transaction
          });

          // Verify all selected lessons are actually for the next grade level
          const invalidLessons = nextGradeLessons.filter(lesson => 
              lesson.subjectId !== nextGradeSubject.id
          );
          
          if (invalidLessons.length > 0) {
              throw new Error(`Selected lessons must be for ${nextGradeSubject.name} (${nextGradeLevel})`);
          }

      } else {
          // Auto-find available lessons (original behavior)
          nextGradeLessons = await Lesson.findAll({
              where: {
                  subjectId: nextGradeSubject.id,
                  agencyId: currentLesson.agencyId,
                  isActive: true,
                  currentCap: { [Op.lt]: sequelize.col('totalCap') }
              },
              include: [
                  {
                      model: Subject,
                      as: "subject",
                      attributes: ["id", "name", "gradeLevel"]
                  },
                  {
                      model: Location,
                      as: "location",
                      attributes: ["id", "address"]
                  },
                  {
                      model: User,
                      as: "tutor",
                      attributes: ["id", "firstName", "lastName"]
                  }
              ],
              transaction
          });
      }

      if (nextGradeLessons.length === 0) {
          throw new Error(`No available lessons found for ${nextGradeSubject.name} (${nextGradeLevel})`);
      } 

      // 5. Get enrolled students from current lesson
      const enrolledStudents = currentLesson.enrollments
        .filter(enrollment => enrollment.student)
        .map(enrollment => enrollment.student);

      if (enrolledStudents.length === 0) {
        throw new Error("No students enrolled in the current lesson");
      }

      console.log(`Found ${enrolledStudents.length} enrolled students`);

      // 6. Send grade progression notifications
      const notificationResults = [];
      for (const student of enrolledStudents) {
        try {
          // ✅ USE custom message if provided, otherwise use default
          const notificationMessage = customMessage 
            ? customMessage
            : `Great job completing ${currentLesson.subject.name} ${currentLesson.subject.gradeLevel}! Continue to ${currentLesson.subject.name} ${nextGradeLevel}.`;

          const notification = await Notification.create({
            title: `🎓 Ready for ${nextGradeLevel}!`,
            message: notificationMessage, // ✅ Use dynamic message
            type: 'grade_progression',
            lessonId: currentLesson.id,
            agencyId: currentLesson.agencyId,
            userId: student.id,
            isRead: false,
            priority: 'high',
            metadata: {
                currentGrade: currentLesson.subject.gradeLevel,
                nextGrade: nextGradeLevel,
                subjectName: currentLesson.subject.name,
                availableLessonIds: nextGradeLessons.map(lesson => lesson.id),
                studentName: `${student.firstName} ${student.lastName}`,
                actionRequired: true,
                targetLessonId: nextGradeLessons[0]?.id,
                targetScreen: 'lesson-details',
                // ✅ ADD: Track if custom message was used
                usedCustomMessage: !!customMessage,
                originalMessage: customMessage ? `Great job completing ${currentLesson.subject.name} ${currentLesson.subject.gradeLevel}! Continue to ${currentLesson.subject.name} ${nextGradeLevel}.` : null
            }
          }, { transaction });

          notificationResults.push({
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            status: 'sent',
            notificationId: notification.id,
            usedCustomMessage: !!customMessage // ✅ Track in results
          });

          console.log(`Notification created for student: ${student.email}`);

        } catch (error) {
          console.error(`Failed to send notification to student ${student.id}:`, error);
          notificationResults.push({
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            status: 'failed',
            error: error.message
          });
        }
      }

      await transaction.commit();

      console.log(`🎉 Successfully sent ${notificationResults.filter(r => r.status === 'sent').length} grade progression notifications`);

      return {
        currentLesson: {
          id: currentLesson.id,
          title: currentLesson.title,
          subject: currentLesson.subject.name,
          gradeLevel: currentLesson.subject.gradeLevel
        },
        nextGradeSubject: {
          id: nextGradeSubject.id,
          name: nextGradeSubject.name,
          gradeLevel: nextGradeSubject.gradeLevel
        },
        availableNextGradeLessons: nextGradeLessons.map(lesson => ({
          id: lesson.id,
          title: lesson.title,
          dayOfWeek: lesson.dayOfWeek,
          timeSlot: `${lesson.startTime} - ${lesson.endTime}`,
          location: lesson.location?.address,
          tutor: lesson.tutor ? `${lesson.tutor.firstName} ${lesson.tutor.lastName}` : 'Not assigned',
          availableSpots: lesson.totalCap - lesson.currentCap
        })),
        notifiedStudents: notificationResults.filter(r => r.status === 'sent').length,
        totalStudents: enrolledStudents.length,
        usedCustomMessage: !!customMessage, // ✅ ADD this
        customMessage: customMessage || null, // ✅ ADD this
        notificationResults
      };

    } catch (error) {
      await transaction.rollback();
      console.error(`Failed to send grade progression notifications:`, error);
      throw new Error(`Failed to send grade progression notifications: ${error.message}`);
    }
  }

  async getUserNotifications(userId, options = {}) {
    const { limit = 50, offset = 0, unreadOnly = false } = options;
    
    const where = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const notifications = await Notification.findAll({
      where,
      include: [
        {
          model: Lesson,
          as: 'lesson',
          attributes: ['id', 'title'],
          include: [{
            model: Subject,
            as: 'subject',
            attributes: ['id', 'name', 'gradeLevel']
          }]
        },
        {
          model: Agency,
          as: 'agency',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    return notifications;
  }

  async getNotificationStats(userId) {
    const total = await Notification.count({ 
      where: { userId }
    });
    
    const unread = await Notification.count({ 
      where: { 
        userId, 
        isRead: false
      } 
    });

    return { total, unread };
  }

  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      where: { id: notificationId, userId }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await notification.update({ isRead: true });
    return notification;
  }

  async markAllAsRead(userId) {
    const result = await Notification.update(
      { isRead: true },
      { 
        where: { 
          userId, 
          isRead: false
        } 
      }
    );

    return result[0]; // Number of affected rows
  }

  async deleteNotification(notificationId, userId) {
    const notification = await Notification.findOne({
      where: { id: notificationId, userId }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await notification.destroy();
  }

  getNextGradeLevel(currentGradeLevel) {
    return getNextGradeLevel(currentGradeLevel);
  }

  canProgressToNextGrade(currentGradeLevel) {
    return canProgressToNextGrade(currentGradeLevel);
  }
}

export default NotificationService;