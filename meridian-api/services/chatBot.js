const Shipment = require('../models/Shipment');

const GREETING_RESPONSES = [
  "Hello! Welcome to Meridian Logistics. How may I help you today?",
];

const MAIN_MENU_ACTIONS = [
  { label: 'Track my package', value: 'track_package' },
  { label: 'Talk to support', value: 'talk_to_support' },
  { label: 'Report a problem', value: 'report_problem' },
  { label: 'Delivery delay inquiry', value: 'delivery_delay' }
];

const STATUS_LABELS = {
  pending: 'Pending Pickup',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  on_hold: 'On Hold'
};

class ChatBot {
  async processMessage(session, userMessage) {
    const state = session.context?.state || 'greeting';
    const msg = userMessage.trim().toLowerCase();

    switch (state) {
      case 'greeting':
        return this.handleGreeting();

      case 'awaiting_choice':
        return this.handleChoice(msg, userMessage);

      case 'awaiting_tracking_id':
        return await this.handleTrackingId(userMessage.trim().toUpperCase());

      case 'awaiting_delay_tracking_id':
        return await this.handleDelayTrackingId(userMessage.trim().toUpperCase());

      case 'awaiting_problem_description':
        return this.handleProblemReport(userMessage);

      case 'follow_up':
        return this.handleFollowUp(msg);

      default:
        return this.handleGreeting();
    }
  }

  handleGreeting() {
    return {
      message: GREETING_RESPONSES[0],
      quickActions: MAIN_MENU_ACTIONS,
      newState: 'awaiting_choice'
    };
  }

  handleChoice(msg, rawMessage) {
    // Handle both button values and free text
    if (msg === 'track_package' || msg.includes('track') || msg.includes('package') || msg.includes('parcel')) {
      return {
        message: "Sure! Please enter your tracking ID (e.g., VLX-XXXXXXXX):",
        quickActions: [],
        newState: 'awaiting_tracking_id'
      };
    }

    if (msg === 'talk_to_support' || msg.includes('support') || msg.includes('human') || msg.includes('agent') || msg.includes('speak')) {
      return {
        message: "I'm connecting you to a support agent now. Please hold on — someone will be with you shortly!",
        quickActions: [],
        newState: 'escalate_to_human'
      };
    }

    if (msg === 'report_problem' || msg.includes('report') || msg.includes('problem') || msg.includes('issue') || msg.includes('complaint')) {
      return {
        message: "I'm sorry to hear you're having an issue. Please describe your problem and I'll log it for our team:",
        quickActions: [],
        newState: 'awaiting_problem_description'
      };
    }

    if (msg === 'delivery_delay' || msg.includes('delay') || msg.includes('late') || msg.includes('slow') || msg.includes('when')) {
      return {
        message: "I can check on your delivery status. Please provide your tracking ID:",
        quickActions: [],
        newState: 'awaiting_delay_tracking_id'
      };
    }

    // Fallback — show menu again
    return {
      message: "I'm not sure I understood that. Please select one of the options below, or type your question:",
      quickActions: MAIN_MENU_ACTIONS,
      newState: 'awaiting_choice'
    };
  }

  async handleTrackingId(trackingId) {
    try {
      const shipment = await Shipment.findOne({ trackingId });
      if (!shipment) {
        return {
          message: `I couldn't find a shipment with tracking ID **${trackingId}**. Please double-check the ID and try again.`,
          quickActions: [
            { label: 'Try another ID', value: 'track_package' },
            { label: 'Talk to support', value: 'talk_to_support' },
            { label: 'Main menu', value: 'main_menu' }
          ],
          newState: 'awaiting_choice'
        };
      }

      const statusLabel = STATUS_LABELS[shipment.status] || shipment.status;
      const eta = shipment.estimatedDelivery
        ? new Date(shipment.estimatedDelivery).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
        : 'Not available';
      const location = shipment.currentLocation?.city || 'Unknown';

      return {
        message: `**Shipment ${shipment.trackingId}**\n\n` +
          `**Status:** ${statusLabel}\n` +
          `**Current Location:** ${location}\n` +
          `**From:** ${shipment.origin?.city} → **To:** ${shipment.destination?.city}\n` +
          `**Estimated Delivery:** ${eta}\n\n` +
          (shipment.status === 'on_hold' ? `**Hold Reason:** ${shipment.holdReason}\n\n` : '') +
          `Is there anything else I can help with?`,
        quickActions: [
          { label: 'Track another package', value: 'track_package' },
          { label: 'Talk to support', value: 'talk_to_support' },
          { label: 'Main menu', value: 'main_menu' }
        ],
        newState: 'awaiting_choice'
      };
    } catch (error) {
      console.error('Bot tracking lookup error:', error);
      return {
        message: "Sorry, I encountered an error looking up your shipment. Please try again or contact support.",
        quickActions: MAIN_MENU_ACTIONS,
        newState: 'awaiting_choice'
      };
    }
  }

  async handleDelayTrackingId(trackingId) {
    try {
      const shipment = await Shipment.findOne({ trackingId });
      if (!shipment) {
        return {
          message: `No shipment found with ID **${trackingId}**. Please verify and try again.`,
          quickActions: [
            { label: 'Try again', value: 'delivery_delay' },
            { label: 'Talk to support', value: 'talk_to_support' }
          ],
          newState: 'awaiting_choice'
        };
      }

      const statusLabel = STATUS_LABELS[shipment.status] || shipment.status;
      const eta = shipment.estimatedDelivery
        ? new Date(shipment.estimatedDelivery).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
        : 'Not available';

      let delayInfo = '';
      if (shipment.status === 'on_hold') {
        delayInfo = `\n\nYour shipment is currently **on hold**. Reason: ${shipment.holdReason || 'Under review'}. We recommend speaking with our support team for more details.`;
      } else if (shipment.status === 'delivered') {
        delayInfo = `\n\nGreat news! Your shipment has been **delivered**.`;
      } else if (shipment.estimatedDelivery && new Date(shipment.estimatedDelivery) < new Date()) {
        delayInfo = `\n\nYour shipment appears to be **past the estimated delivery date**. We apologize for the delay. Would you like to speak with support?`;
      } else {
        delayInfo = `\n\nYour shipment is on schedule. Estimated delivery: **${eta}**.`;
      }

      return {
        message: `**Delay Inquiry — ${shipment.trackingId}**\n\n**Status:** ${statusLabel}\n**Location:** ${shipment.currentLocation?.city || 'In transit'}${delayInfo}`,
        quickActions: [
          { label: 'Talk to support', value: 'talk_to_support' },
          { label: 'Track another package', value: 'track_package' },
          { label: 'Main menu', value: 'main_menu' }
        ],
        newState: 'awaiting_choice'
      };
    } catch (error) {
      console.error('Bot delay lookup error:', error);
      return {
        message: "Sorry, I had trouble checking that shipment. Please try again.",
        quickActions: MAIN_MENU_ACTIONS,
        newState: 'awaiting_choice'
      };
    }
  }

  handleProblemReport(description) {
    return {
      message: `Thank you for reporting this issue. I've logged your concern:\n\n> _"${description}"_\n\nOur team will review it shortly. Would you like to speak with a support agent about this?`,
      quickActions: [
        { label: 'Yes, connect me', value: 'talk_to_support' },
        { label: 'No, that\'s all', value: 'main_menu' }
      ],
      newState: 'awaiting_choice'
    };
  }

  handleFollowUp(msg) {
    if (msg.includes('yes') || msg.includes('more') || msg.includes('help')) {
      return this.handleGreeting();
    }
    return {
      message: "Thank you for using Meridian! If you need anything else, just send a message anytime. Have a great day!",
      quickActions: [{ label: 'Start over', value: 'main_menu' }],
      newState: 'awaiting_choice'
    };
  }
}

module.exports = new ChatBot();
