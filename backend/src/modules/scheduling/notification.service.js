import { Notification, User, Lesson, Subject, StudentLesson, Location, Agency } from "../../models/index.js";
import { Op } from "sequelize";
import { getNextGradeLevel } from "../../util/enum/gradeProgressionEnum.js";
import sequelize from "../../config/database.js";

class NotificationService {

  // MAIN CRON METHOD
  async sendAutomaticGradeProgressionNotifications() {
    try {
      console.log('🔔 Starting automatic grade progression notifications...');
      
      // Find lessons that ended yesterday (give 1 day buffer)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      
      console.log('📅 Looking for lessons that ended between:', yesterday, 'and', today);
        
      const endedLessons = await Lesson.findAll({
        where: {
          endDate: {
            [Op.between]: [yesterday, today] // Lessons that ended anytime yesterday
          },
          isActive: true,
          progressionNotificationsSent: false,
          notificationTemplateSubmitted: true // ✅ Only process lessons with submitted templates
        },
        include: [
          {
            model: Subject,
            as: "subject",
            attributes: ["id", "name", "gradeLevel"]
          },
          {
            model: StudentLesson,
            as: "enrollments",
            include: [{
              model: User,
              as: "student",
              attributes: ["id", "firstName", "lastName", "email"]
            }]
          },
          {
            model: Agency,
            as: "agency",
            attributes: ["id", "name"]
          }
        ]
      });
      
      console.log(`📅 Found ${endedLessons.length} lessons that ended yesterday with submitted templates`);
      
      let totalNotificationsSent = 0;
      
      for (const lesson of endedLessons) {
        const sentCount = await this.sendNotificationsForLesson(lesson);
        totalNotificationsSent += sentCount;
      }
      
      console.log(`🎉 Successfully sent ${totalNotificationsSent} automatic grade progression notifications`);
      return totalNotificationsSent;
      
    } catch (error) {
      console.error('❌ Error in automatic notifications:', error);
      throw error;
    }
  }

  // ✅ SINGLE sendNotificationsForLesson METHOD
  async sendNotificationsForLesson(lesson) {
    const transaction = await sequelize.transaction();
    try {
      console.log(`📚 Processing lesson: ${lesson.title} (ID: ${lesson.id})`);
      
      // Check if template exists and is submitted
      const template = lesson.notificationTemplate;
      const nextGradeLevel = getNextGradeLevel(lesson.subject.gradeLevel);
      
      if (!nextGradeLevel) {
        console.log(`⏭️ No next grade level for ${lesson.subject.gradeLevel}`);
        await transaction.commit();
        return 0;
      }

      // Only send if template was submitted (double-check)
      if (!lesson.notificationTemplateSubmitted) {
        console.log(`⏭️ No notification template submitted for ${lesson.title}`);
        await transaction.commit();
        return 0;
      }

      // Use template-selected lessons or find available ones
      let nextGradeLessons = [];
      if (template?.selectedLessonIds?.length > 0) {
        nextGradeLessons = await Lesson.findAll({
          where: {
            id: { [Op.in]: template.selectedLessonIds },
            isActive: true,
            currentCap: { [Op.lt]: sequelize.col('totalCap') }
          },
          include: [
            {
              model: Subject,
              as: "subject",
              attributes: ["name", "gradeLevel"]
            },
            {
              model: Location,
              as: "location",
              attributes: ["address"]
            }
          ],
          transaction
        });
        console.log(`📚 Found ${nextGradeLessons.length} template-selected next grade lessons`);
      } else {
        // Fallback to finding available lessons
        const nextGradeSubject = await Subject.findOne({
          where: {
            name: lesson.subject.name,
            gradeLevel: nextGradeLevel,
            isActive: true
          },
          transaction
        });
        
        if (nextGradeSubject) {
          nextGradeLessons = await Lesson.findAll({
            where: {
              subjectId: nextGradeSubject.id,
              agencyId: lesson.agencyId,
              isActive: true,
              currentCap: { [Op.lt]: sequelize.col('totalCap') }
            },
            include: [
              {
                model: Subject,
                as: "subject",
                attributes: ["name", "gradeLevel"]
              },
              {
                model: Location,
                as: "location",
                attributes: ["address"]
              }
            ],
            transaction
          });
          console.log(`📚 Found ${nextGradeLessons.length} available next grade lessons`);
        }
      }

      // Get enrolled students
      const enrolledStudents = lesson.enrollments
        .filter(enrollment => enrollment.student)
        .map(enrollment => enrollment.student);
      
      if (enrolledStudents.length === 0) {
        console.log(`👥 No enrolled students for lesson ${lesson.title}`);
        await transaction.commit();
        return 0;
      }
      
      console.log(`🎓 Sending notifications to ${enrolledStudents.length} students`);
      
      let notificationsSent = 0;
      
      for (const student of enrolledStudents) {
        try {
          // Use custom message from template or default
          const message = template?.customMessage || 
            `Congratulations on completing ${lesson.subject.name} ${lesson.subject.gradeLevel}! You're ready for ${lesson.subject.name} ${nextGradeLevel}. Check out available classes for the next level!`;
          
          await this.createStudentNotification(student, lesson, nextGradeLessons, nextGradeLevel, message, transaction);
          notificationsSent++;
        } catch (error) {
          console.error(`❌ Failed to send notification to student ${student.id}:`, error);
        }
      }
      
      // Mark lesson as processed
      await lesson.update({ 
        progressionNotificationsSent: true 
      }, { transaction });
      
      await transaction.commit();
      
      console.log(`✅ Sent ${notificationsSent} notifications for lesson ${lesson.title}`);
      return notificationsSent;
      
    } catch (error) {
      await transaction.rollback();
      console.error(`❌ Error sending notifications for lesson ${lesson.id}:`, error);
      return 0;
    }
  }

  // ✅ SINGLE createStudentNotification METHOD
  async createStudentNotification(student, lesson, nextGradeLessons, nextGradeLevel, message, transaction) {
    const targetLessonId = nextGradeLessons.length > 0 ? nextGradeLessons[0].id : null;
    
    await Notification.create({
      title: `🎓 Ready for ${nextGradeLevel}!`,
      message: message,
      type: 'grade_progression',
      lessonId: lesson.id,
      agencyId: lesson.agencyId,
      userId: student.id,
      isRead: false,
      priority: 'high',
      sourceTemplateId: lesson.id, // ✅ Track which template was used
      metadata: {
        currentGrade: lesson.subject.gradeLevel,
        nextGrade: nextGradeLevel,
        subjectName: lesson.subject.name,
        availableLessonIds: nextGradeLessons.map(l => l.id),
        targetLessonId: targetLessonId,
        sentAutomatically: true,
        sentDate: new Date().toISOString().split('T')[0],
        studentName: `${student.firstName} ${student.lastName}`,
        templateUsed: true // ✅ Mark that this used a template
      }
    }, { transaction });
  }

  // ✅ TEMPLATE MANAGEMENT METHODS
  async handleGetNextGradeOptions(req, res) {
    try {
      const { lessonId } = req.params;
      
      console.log("🔔 Getting next grade options for lesson:", lessonId);
      
      const nextGradeOptions = await this.getNextGradeOptions(lessonId);
      
      res.status(200).json({
        success: true,
        data: nextGradeOptions
      });
    } catch (error) {
      console.error("Error getting next grade options:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get next grade options"
      });
    }
  }

  async handleSaveNotificationTemplate(req, res) {
    try {
      const { lessonId } = req.params;
      const { selectedLessonIds, customMessage } = req.body;
      const userId = req.user.userId;
      
      const template = await this.saveNotificationTemplate(lessonId, selectedLessonIds, customMessage, userId);
      
      res.status(200).json({
        success: true,
        message: "Notification template saved successfully",
        data: template
      });
    } catch (error) {
      console.error("Error saving notification template:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to save notification template"
      });
    }
  }

  async handleGetNotificationTemplate(req, res) {
    try {
      const { lessonId } = req.params;
      
      const templateData = await this.getNotificationTemplate(lessonId);
      
      // ✅ FIXED: Return the correct format that frontend expects
      res.status(200).json({
        success: true,
        data: {
          templateExists: templateData.templateExists,
          template: templateData.template
        }
      });
    } catch (error) {
      console.error("Error getting notification template:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get notification template"
      });
    }
  }

  // ✅ BUSINESS LOGIC METHODS
  async getNextGradeOptions(lessonId) {
    const lesson = await Lesson.findByPk(lessonId, {
      include: [{
        model: Subject,
        as: "subject",
        attributes: ["id", "name", "gradeLevel"]
      }]
    });

    if (!lesson) {
      throw new Error('Lesson not found');
    }

    const nextGradeLevel = getNextGradeLevel(lesson.subject.gradeLevel);
    if (!nextGradeLevel) {
      return {
        nextGradeInfo: {
          currentGrade: lesson.subject.gradeLevel,
          nextGrade: null,
          subjectName: lesson.subject.name
        },
        availableNextGradeLessons: []
      };
    }

    // Find next grade subject
    const nextGradeSubject = await Subject.findOne({
      where: {
        name: lesson.subject.name,
        gradeLevel: nextGradeLevel,
        isActive: true
      }
    });

    let availableNextGradeLessons = [];
    if (nextGradeSubject) {
      availableNextGradeLessons = await Lesson.findAll({
        where: {
          subjectId: nextGradeSubject.id,
          agencyId: lesson.agencyId,
          isActive: true,
          currentCap: { [Op.lt]: sequelize.col('totalCap') }
        },
        include: [
          {
            model: Subject,
            as: "subject",
            attributes: ["name", "gradeLevel"]
          },
          {
            model: Location,
            as: "location",
            attributes: ["address"]
          },
          {
            model: User,
            as: "tutor",
            attributes: ["firstName", "lastName"]
          }
        ]
      });
    }

    return {
      nextGradeInfo: {
        currentGrade: lesson.subject.gradeLevel,
        nextGrade: nextGradeLevel,
        subjectName: lesson.subject.name
      },
      availableNextGradeLessons: availableNextGradeLessons.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        location: lesson.location?.address,
        tutor: lesson.tutor ? `${lesson.tutor.firstName} ${lesson.tutor.lastName}` : 'No tutor assigned',
        dayOfWeek: lesson.dayOfWeek,
        timeSlot: `${lesson.startTime} - ${lesson.endTime}`,
        availableSpots: lesson.totalCap - lesson.currentCap
      }))
    };
  }

  async saveNotificationTemplate(lessonId, selectedLessonIds, customMessage, submittedByUserId) {
    const transaction = await sequelize.transaction();
    try {
      const lesson = await Lesson.findByPk(lessonId, { transaction });
      if (!lesson) {
        throw new Error('Lesson not found');
      }

      // ✅ PREVENT MULTIPLE SUBMISSIONS
      if (lesson.notificationTemplateSubmitted) {
        throw new Error('Notification template has already been submitted for this lesson and cannot be modified');
      }

      const templateData = {
        selectedLessonIds: selectedLessonIds || [],
        customMessage: customMessage || null,
        createdAt: new Date(),
        submittedBy: submittedByUserId
      };

      // Update lesson with template data and mark as submitted
      await lesson.update({ 
        notificationTemplate: templateData,
        notificationTemplateSubmitted: true,
        notificationTemplateSubmittedAt: new Date(),
        notificationTemplateSubmittedBy: submittedByUserId
      }, { transaction });

      await transaction.commit();
      return templateData;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getNotificationTemplate(lessonId) {
    const lesson = await Lesson.findByPk(lessonId, {
      attributes: ['id', 'notificationTemplate', 'notificationTemplateSubmitted', 'notificationTemplateSubmittedAt']
    });
    
    return {
      template: lesson?.notificationTemplate || null,
      templateExists: !!lesson?.notificationTemplateSubmitted,
      submittedAt: lesson?.notificationTemplateSubmittedAt
    };
  }

  // ✅ BASIC NOTIFICATION METHODS
  async handleGetUserNotifications(req, res) {
    try {
      const userId = req.user.userId;
      const { limit, offset, unreadOnly } = req.query;
      
      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          message: "User ID is required" 
        });
      }

      const notifications = await this.getUserNotifications(userId, {
        limit: Math.min(parseInt(limit) || 50, 100),
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