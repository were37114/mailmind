import React, { useState } from 'react';
import { sceneEngine, type SceneCard } from '../core/scene-recommend/scene-engine';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';

const ScenePanel: React.FC = () => {
  const [cards, setCards] = useState<SceneCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, 'positive' | 'negative'>>({});

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const result = await sceneEngine.generateRecommendations('current_user');
      setCards(result);
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  };

  const handleFeedback = async (card: SceneCard, isPositive: boolean) => {
    setFeedback(prev => ({ ...prev, [card.id]: isPositive ? 'positive' : 'negative' }));
    await sceneEngine.recordFeedback(card.id, 'current_user', isPositive);
  };

  if (!loaded) {
    return (
      <div className="scene-panel">
        <h2>智能推荐</h2>
        <EmptyState
          icon="💡"
          title="获取智能推荐"
          description="基于您的邮件情况，为您推荐待办事项"
          actionLabel="查看推荐"
          onAction={loadRecommendations}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="scene-panel">
        <h2>智能推荐</h2>
        <LoadingSkeleton count={2} type="card" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="scene-panel">
        <h2>智能推荐</h2>
        <EmptyState
          icon="✨"
          title="暂无推荐"
          description="当前没有触发推荐条件，一切正常"
          actionLabel="刷新"
          onAction={loadRecommendations}
        />
      </div>
    );
  }

  return (
    <div className="scene-panel">
      <h2>智能推荐</h2>
      <div className="scene-cards">
        {cards.map(card => (
          <div key={card.id} className={`scene-card ${card.badge ? 'urgent' : ''}`}>
            <div className="scene-header">
              {card.badge && <span className="scene-badge">{card.badge}</span>}
              <span className="scene-score">推荐度: {Math.round(card.score * 100)}%</span>
            </div>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
            <div className="scene-card__footer">
              <button className="btn-primary">{card.actionText}</button>
              <div className="scene-feedback">
                <button
                  className={`feedback-btn ${feedback[card.id] === 'positive' ? 'active' : ''}`}
                  onClick={() => handleFeedback(card, true)}
                  title="有用"
                >
                  👍
                </button>
                <button
                  className={`feedback-btn ${feedback[card.id] === 'negative' ? 'active' : ''}`}
                  onClick={() => handleFeedback(card, false)}
                  title="没用"
                >
                  👎
                </button>
                <button className="feedback-btn" title="换一个">🔄</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScenePanel;
