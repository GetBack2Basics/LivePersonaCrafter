import { useMemo } from 'react';
import type { ParticipantFeedback, BotResponse } from '../types';

export function useFeedbackCollector(feedbacks: ParticipantFeedback[], botResponses: BotResponse[]) {
  const stats = useMemo(() => {
    if (feedbacks.length === 0) {
      return {
        totalEvaluations: 0,
        averageScore: 0,
        matchRatePercentage: 0,
        fiveStarCount: 0,
        fourStarCount: 0,
        lowRatingCount: 0
      };
    }

    const total = feedbacks.length;
    const sum = feedbacks.reduce((acc, f) => acc + f.alignmentScore, 0);
    const matches = feedbacks.filter((f) => f.isPersonaMatch).length;
    const fiveStars = feedbacks.filter((f) => f.alignmentScore === 5).length;
    const fourStars = feedbacks.filter((f) => f.alignmentScore === 4).length;
    const lowRatings = feedbacks.filter((f) => f.alignmentScore < 4).length;

    return {
      totalEvaluations: total,
      averageScore: Number((sum / total).toFixed(2)),
      matchRatePercentage: Math.round((matches / total) * 100),
      fiveStarCount: fiveStars,
      fourStarCount: fourStars,
      lowRatingCount: lowRatings
    };
  }, [feedbacks]);

  const exportFeedbackDatasetJSON = () => {
    const data = JSON.stringify({ feedbacks, botResponses }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meetpersona-feedback-dataset-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    stats,
    exportFeedbackDatasetJSON
  };
}
