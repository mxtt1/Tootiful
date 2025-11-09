import { Notification, User, Lesson, Subject, StudentLesson, Location, Agency } from "../../models/index.js";
import { Op } from "sequelize";
import { getNextGradeLevel, canProgressToNextGrade } from "../../util/enum/gradeProgressionEnum.js";
import sequelize from "../../config/database.js";

class NotificationService {

  // Route handler methods with complete HTTP response logic
  async handleGetUserNotifications(req, res) {
    try {
      const userId = req.user.userId;
      const { limit, offset, unreadOnly } = req.query;
      
      // Input validation
      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          message: "User ID is required" 
        });
      }

      const notifications = await this.getUserNotifications(userId, {
        limit: Math.min(parseInt(limit) || 50, 100), // Cap at 100
        offset: Math.max(parseInt(offset) || 0, 0),
        unreadOnly: unreadOnly === 'true'
      });

      res.status(200).json({
        success: true,
        data: notifications
      });
    } catch (error) {
      console.error("Error getting user notifications:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve notifications"
      });
    }
  }

  async handleGetNextGradeOptions(req, res) {
    const { lessonId } = req.params;
    
    try {
      // Input validation
      if (!lessonId) {
        return res.status(400).json({ 
          success: false, 
          message: "Lesson ID is required" 
        });
      }

      console.log("🔍 DEBUG - Getting next grade options for lesson:", lessonId);
      
      const currentLesson = await Lesson.findByPk(lessonId, {
        include: [{
          model: Subject,
          as: "subject",
          attributes: ["id", "name", "gradeLevel"]
        }]
      });

      if (!currentLesson) {
        return res.status(404).json({ 
          success: false, 
          message: "Lesson not found" 
        });
      }

      if (!currentLesson.subject) {
        return res.status(400).json({ 
          success: false, 
          message: "Lesson subject not found" 
        });
      }

      console.log("🔍 DEBUG - Current lesson subject:", {
        name: currentLesson.subject.name,
        gradeLevel: currentLesson.subject.gradeLevel
      });

      const nextGradeLevel = getNextGradeLevel(currentLesson.subject.gradeLevel);
      
      console.log("🔍 DEBUG - Next grade level result:", nextGradeLevel);
      
      if (!nextGradeLevel) {
        console.log("❌ DEBUG - No next grade level found for:", currentLesson.subject.gradeLevel);
        return res.status(200).json({ 
          success: true, 
          availableNextGradeLessons: [],
          message: `No next grade level available for ${currentLesson.subject.gradeLevel}`
        });
      }

      console.log("🔍 DEBUG - Looking for next grade subject:", {
        name: currentLesson.subject.name,
        nextGradeLevel: nextGradeLevel
      });

      const nextGradeSubject = await Subject.findOne({
        where: {
          name: currentLesson.subject.name,
          gradeLevel: nextGradeLevel,
          isActive: true
        }
      });

      console.log("🔍 DEBUG - Next grade subject found:", nextGradeSubject);

      if (!nextGradeSubject) {
        console.log("❌ DEBUG - No next grade subject found");
        return res.status(200).json({ 
          success: true, 
          availableNextGradeLessons: [],
          message: `No ${nextGradeLevel} level found for subject ${currentLesson.subject.name}`
        });
      }

      console.log("🔍 DEBUG - Looking for next grade lessons for subject:", nextGradeSubject.id);

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

      console.log("🔍 DEBUG - Found next grade lessons:", nextGradeLessons.length);

      res.status(200).json({
        success: true,
        availableNextGradeLessons: nextGradeLessons.map(lesson => ({
          id: lesson.id,
          title: lesson.title,
          dayOfWeek: lesson.dayOfWeek,
          timeSlot: `${lesson.startTime} - ${lesson.endTime}`,
          location: lesson.location?.address,
          tutor: lesson.tutor ? `${lesson.tutor.firstName} ${lesson.tutor.lastName}` : 'Not assigned',
          availableSpots: lesson.totalCap - lesson.currentCap
        })),
        nextGradeInfo: {
          currentGrade: currentLesson.subject.gradeLevel,
          nextGrade: nextGradeLevel,
          subjectName: currentLesson.subject.name
        }
      });

    } catch (error) {
      console.error("❌ Error getting next grade options:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to get next grade options",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async handleGetNotificationStats(req, res) {
    try {
      const userId = req.user.userId;
      
      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          message: "User ID is required" 
        });
      }

      const stats = await this.getNotificationStats(userId);
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error("Error getting notification stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get notification statistics"
      });
    }
  }
  
  async handleSendGradeProgressionNotifications(req, res) {
    const { lessonId } = req.params;
    const { selectedLessonIds, customMessage } = req.body; 
    
    try {
      // Input validation
      if (!lessonId) {
        return res.status(400).json({ 
          success: false, 
          message: "Lesson ID is required" 
        });
      }

      if (customMessage && customMessage.length > 500) {
        return res.status(400).json({ 
          success: false, 
          message: "Custom message must be less than 500 characters" 
        });
      }

      if (selectedLessonIds && !Array.isArray(selectedLessonIds)) {
        return res.status(400).json({ 
          success: false, 
          message: "selectedLessonIds must be an array" 
        });
      }

      const result = await this.sendGradeProgressionNotifications(lessonId, selectedLessonIds, customMessage);
      
      res.status(200).json({
        success: true,
        message: `Grade progression notifications sent to ${result.notifiedStudents} students`,
        data: result
      });
    } catch (error) {
      console.error("Error sending grade progression notifications:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to send grade progression notifications"
      });
    }
  }

  async handleMarkAsRead(req, res) {
    const { id } = req.params;
    const userId = req.user.userId;
    
    try {
      if (!id || !userId) {
        return res.status(400).json({ 
          success: false, 
          message: "Notification ID and User ID are required" 
        });
      }

      const notification = await this.markAsRead(id, userId);
      
      res.status(200).json({
        success: true,
        message: "Notification marked as read",
        data: notification
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(error.message === 'Notification not found' ? 404 : 500).json({
        success: false,
        message: error.message || "Failed to mark notification as read"
      });
    }
  }

  async handleMarkAllAsRead(req, res) {
    const userId = req.user.userId;
    
    try {
      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          message: "User ID is required" 
        });
      }

      const affectedCount = await this.markAllAsRead(userId);
      
      res.status(200).json({
        success: true,
        message: `Marked ${affectedCount} notifications as read`,
        data: { affectedCount }
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({
        success: false,
        message: "Failed to mark notifications as read"
      });
    }
  }

  async handleDeleteNotification(req, res) {
    const { id } = req.params;
    const userId = req.user.userId;
    
    try {
      if (!id || !userId) {
        return res.status(400).json({ 
          success: false, 
          message: "Notification ID and User ID are required" 
        });
      }

      await this.deleteNotification(id, userId);
      
      res.status(200).json({
        success: true,
        message: "Notification deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(error.message === 'Notification not found' ? 404 : 500).json({
        success: false,
        message: error.message || "Failed to delete notification"
      });
    }
  }

  // Business logic methods
  async sendGradeProgressionNotifications(lessonId, selectedLessonIds = [], customMessage = null) {
    const transaction = await sequelize.transaction();
    try {
      console.log(`Sending grade progression notifications for lesson: ${lessonId}`);
      
      // Validate custom message length
      if (customMessage && customMessage.length > 500) {
        throw new Error("Custom message must be less than 500 characters");
      }

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

      const nextGradeLevel = getNextGradeLevel(currentLesson.subject.gradeLevel);
      if (!nextGradeLevel) {
        throw new Error(`No next grade level available for ${currentLesson.subject.gradeLevel}`);
      }

      console.log(`Current grade: ${currentLesson.subject.gradeLevel}, Next grade: ${nextGradeLevel}`);

      // Find the next grade subject
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

      // Find available lessons for the next grade subject
      let nextGradeLessons;
      
      if (selectedLessonIds && selectedLessonIds.length > 0) {
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

      // Get enrolled students from current lesson
      const enrolledStudents = currentLesson.enrollments
        .filter(enrollment => enrollment.student)
        .map(enrollment => enrollment.student);

      if (enrolledStudents.length === 0) {
        throw new Error("No students enrolled in the current lesson");
      }

      console.log(`Found ${enrolledStudents.length} enrolled students`);

      // Send grade progression notifications
      const notificationResults = [];
      for (const student of enrolledStudents) {
        try {
          const notificationMessage = customMessage 
            ? customMessage
            : `Great job completing ${currentLesson.subject.name} ${currentLesson.subject.gradeLevel}! Continue to ${currentLesson.subject.name} ${nextGradeLevel}.`;

          const notification = await Notification.create({
            title: `🎓 Ready for ${nextGradeLevel}!`,
            message: notificationMessage,
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
              usedCustomMessage: !!customMessage,
              originalMessage: customMessage ? `Great job completing ${currentLesson.subject.name} ${currentLesson.subject.gradeLevel}! Continue to ${currentLesson.subject.name} ${nextGradeLevel}.` : null
            }
          }, { transaction });

          notificationResults.push({
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            studentEmail: student.email,
            status: 'sent',
            notificationId: notification.id,
            usedCustomMessage: !!customMessage
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

      const successfulNotifications = notificationResults.filter(r => r.status === 'sent').length;
      console.log(`🎉 Successfully sent ${successfulNotifications} grade progression notifications`);

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
        notifiedStudents: successfulNotifications,
        totalStudents: enrolledStudents.length,
        failedStudents: notificationResults.filter(r => r.status === 'failed').length,
        usedCustomMessage: !!customMessage, 
        customMessage: customMessage || null, 
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

    return result[0];
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
}

export default NotificationService;