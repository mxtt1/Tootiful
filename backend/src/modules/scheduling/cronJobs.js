import cron from 'node-cron';
import NotificationService from './services/NotificationService.js';

const notificationService = new NotificationService();

// Run every day at 9:00 AM
cron.schedule('*/5 * * * *', async () => {
  console.log('🕘 Running daily automatic grade progression notifications...');
  try {
    const sentCount = await notificationService.sendAutomaticGradeProgressionNotifications();
    console.log(`✅ Daily notification job completed. Sent ${sentCount} notifications.`);
  } catch (error) {
    console.error('❌ Daily notification job failed:', error);
  }
});

// Optional: Test endpoint to manually trigger (for development)
export const triggerManualNotificationRun = async () => {
  console.log('🔔 Manually triggering notification run...');
  return await notificationService.sendAutomaticGradeProgressionNotifications();
};