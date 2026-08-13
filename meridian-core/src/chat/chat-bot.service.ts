import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type BotResponse = {
  message: string;
  quickActions: { label: string; value: string }[];
  newState: string;
};

const MAIN_MENU = [
  { label: 'Track my package', value: 'track_package' },
  { label: 'Talk to support', value: 'talk_to_support' },
  { label: 'Report a problem', value: 'report_problem' },
  { label: 'Delivery delay inquiry', value: 'delivery_delay' },
];

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Pickup',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  on_hold: 'On Hold',
};

@Injectable()
export class ChatBotService {
  constructor(private prisma: PrismaService) {}

  async process(state: string, raw: string): Promise<BotResponse> {
    const msg = raw.trim().toLowerCase();
    switch (state) {
      case 'awaiting_tracking_id':
        return this.lookup(raw.trim().toUpperCase());
      case 'awaiting_problem_description':
        return {
          message: `Thank you for reporting this. I've logged your concern and our team will review it shortly. Would you like to speak with a support agent?`,
          quickActions: [
            { label: 'Yes, connect me', value: 'talk_to_support' },
            { label: "No, that's all", value: 'main_menu' },
          ],
          newState: 'awaiting_choice',
        };
      default:
        return this.choice(msg);
    }
  }

  private choice(msg: string): BotResponse {
    if (msg === 'track_package' || msg.includes('track') || msg.includes('package')) {
      return {
        message: 'Sure. Please enter your tracking ID (for example, CP123456785US):',
        quickActions: [],
        newState: 'awaiting_tracking_id',
      };
    }
    if (msg === 'talk_to_support' || msg.includes('support') || msg.includes('human') || msg.includes('agent')) {
      return {
        message: "I'm connecting you to a support agent now. Please hold on, someone will be with you shortly.",
        quickActions: [],
        newState: 'escalate_to_human',
      };
    }
    if (msg === 'report_problem' || msg.includes('problem') || msg.includes('issue')) {
      return {
        message: "I'm sorry to hear that. Please describe the problem and I'll log it for our team:",
        quickActions: [],
        newState: 'awaiting_problem_description',
      };
    }
    if (msg === 'delivery_delay' || msg.includes('delay') || msg.includes('late')) {
      return {
        message: 'I can check on your delivery. Please provide your tracking ID:',
        quickActions: [],
        newState: 'awaiting_tracking_id',
      };
    }
    return {
      message: 'Welcome to Meridian Logistics. How can I help today?',
      quickActions: MAIN_MENU,
      newState: 'awaiting_choice',
    };
  }

  private async lookup(trackingId: string): Promise<BotResponse> {
    const s = await this.prisma.shipment.findUnique({ where: { trackingId } });
    if (!s) {
      return {
        message: `I couldn't find a shipment with tracking ID ${trackingId}. Please double-check and try again.`,
        quickActions: [
          { label: 'Try another ID', value: 'track_package' },
          { label: 'Talk to support', value: 'talk_to_support' },
        ],
        newState: 'awaiting_choice',
      };
    }
    const eta = s.estimatedDelivery
      ? s.estimatedDelivery.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      : 'Not available';
    const loc = (s.currentLocation as { city?: string })?.city || 'In network';
    return {
      message:
        `Shipment ${s.trackingId}\n` +
        `Status: ${STATUS_LABELS[s.status] ?? s.status}\n` +
        `Current location: ${loc}\n` +
        `Estimated delivery: ${eta}\n\n` +
        (s.status === 'on_hold' && s.holdReason ? `Hold reason: ${s.holdReason}\n\n` : '') +
        'Anything else I can help with?',
      quickActions: [
        { label: 'Track another package', value: 'track_package' },
        { label: 'Talk to support', value: 'talk_to_support' },
        { label: 'Main menu', value: 'main_menu' },
      ],
      newState: 'awaiting_choice',
    };
  }
}
