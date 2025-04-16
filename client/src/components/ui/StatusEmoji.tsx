import React from "react";

interface StatusEmojiProps {
  status: string;
}

const StatusEmoji: React.FC<StatusEmojiProps> = ({ status }) => {
  let emoji = "";

  switch (status) {
    case "valid":
      emoji = "✅";
      break;
    case "expiring":
      emoji = "⚠️";
      break;
    case "expired":
      emoji = "❌";
      break;
    default:
      emoji = "📄🕰️";
  }

  return <span className="text-lg">{emoji}</span>;
};

export default StatusEmoji;
