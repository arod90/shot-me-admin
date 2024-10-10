import SendNotification from '../components/SendNotifications';

export default function NotificationsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Send Push Notifications</h1>
      <SendNotification />
    </div>
  );
}
