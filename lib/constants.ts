import { WifiOff, Cloud, Thermometer, Shield, MessageSquare, LucideIcon, Pin, AlertTriangle, Sun } from "lucide-react";

export interface Announcement {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: "info" | "success" | "warning";
  authorName: string;
  authorRole: "User" | "Assistant";
  priority: "low" | "mid" | "high";
  pinned?: boolean;
  icon: LucideIcon;
  color: string;
  fullContent?: string;
}

export const ANNOUNCEMENTS: Announcement[] = [
  { 
    id: "wifi-maint",
    title: "Wi-Fi Maintenance", 
    desc: "Scheduled offline window for critical firmware updates.",
    time: "2:00 AM", 
    type: "info",
    authorName: "Jarvis",
    authorRole: "Assistant",
    priority: "high",
    pinned: true,
    icon: WifiOff,
    color: "text-cyan",
    fullContent: "Our network team will be performing rolling reboots of all primary access points to apply security patches for the KRACK and KR00K vulnerabilities. Expect intermittent connectivity issues between 2:00 AM and 4:00 AM local time."
  },
  { 
    id: "album-sync",
    title: "Family Album Updated", 
    desc: "14 new high-resolution photos were synced to the cloud.",
    time: "5h ago", 
    type: "success",
    authorName: "Funk",
    authorRole: "User",
    priority: "low",
    icon: Cloud,
    color: "text-magenta",
    fullContent: "The 'Vacation 2026' album has been automatically updated with new captures from the living room smart frame. These photos are now available across all linked devices."
  },
  { 
    id: "eco-mode",
    title: "Eco Mode Engaged", 
    desc: "Smart thermostat dropped to 68°F while house is empty.",
    time: "8h ago", 
    type: "info",
    authorName: "Jarvis",
    authorRole: "Assistant",
    priority: "mid",
    icon: Thermometer,
    color: "text-emerald",
    fullContent: "Geofencing triggered the Away state as the last registered occupant left the radius. Estimated energy savings for this session: 1.2 kWh."
  },
  { 
    id: "security-audit",
    title: "Security Audit Complete", 
    desc: "No unauthorized access attempts detected in last 24h.",
    time: "12h ago", 
    type: "success",
    authorName: "Jarvis",
    authorRole: "Assistant",
    priority: "low",
    icon: Shield,
    color: "text-amber",
    fullContent: "The automated security scanner finished its comprehensive check of all internal and external endpoints. Firewall logs show zero flagged intrusions."
  },
  { 
    id: "laundry-done",
    title: "Laundry Cycle Finished", 
    desc: "Smart Washer 1 has completed the heavily soiled cycle.",
    time: "1d ago", 
    type: "info",
    authorName: "Jarvis",
    authorRole: "Assistant",
    priority: "low",
    icon: MessageSquare,
    color: "text-cyan",
    fullContent: "Machine reached end of cycle. Recommend moving items to the dryer to avoid damp odors."
  },
  { 
    id: "intrusion-blocked",
    title: "Intrusion Attempt Blocked", 
    desc: "Firewall dropped 12 malicious packets from unknown IP.",
    time: "2h ago", 
    type: "warning",
    authorName: "Jarvis",
    authorRole: "Assistant",
    priority: "high",
    icon: Shield,
    color: "text-red-400",
    fullContent: "Real-time threat detection identified a port scanning attempt originating from a dynamic IP in a high-risk region. All traffic from this CIDR block has been temporarily blacklisted."
  },
  { 
    id: "package-delivered",
    title: "Package Delivered", 
    desc: "Doorbell camera detected activity at the front porch.",
    time: "3h ago", 
    type: "success",
    authorName: "Jarvis",
    authorRole: "Assistant",
    priority: "mid",
    icon: MessageSquare,
    color: "text-emerald",
    fullContent: "Visual recognition confirmed a package drop-off at 11:42 AM. The front porch lighting has been brightened for enhanced security until retrieval."
  },
  { 
    id: "low-battery",
    title: "Sensor Battery Low", 
    desc: "Kitchen window sensor is currently at 7% battery.",
    time: "4h ago", 
    type: "warning",
    authorName: "Jarvis",
    authorRole: "Assistant",
    priority: "mid",
    icon: AlertTriangle,
    color: "text-amber",
    fullContent: "Zigbee telemetry reports critical voltage drop on node KITCHEN_WINDOW_01. Please replace the CR2032 battery to ensure continuous perimeter monitoring."
  },
  { 
    id: "guest-wifi",
    title: "Guest Access Enabled", 
    desc: "Temporary network 'Jarvis_Guest' is now active for 4h.",
    time: "6h ago", 
    type: "info",
    authorName: "Funk",
    authorRole: "User",
    priority: "low",
    icon: WifiOff,
    color: "text-cyan",
    fullContent: "A guest network has been provisioned with 50Mbps bandwidth limit and client isolation. Credentials have been sent to the primary household contacts."
  },
  { 
    id: "energy-goal",
    title: "Energy Goal Reached", 
    desc: "Solar generation exceeded household consumption by 40%.",
    time: "10h ago", 
    type: "success",
    authorName: "Jarvis",
    authorRole: "Assistant",
    priority: "low",
    icon: Sun,
    color: "text-amber",
    fullContent: "Optimal weather conditions and reduced appliance usage resulted in a net-positive energy day. Surplus power has been diverted to the EV charging station."
  }
];
