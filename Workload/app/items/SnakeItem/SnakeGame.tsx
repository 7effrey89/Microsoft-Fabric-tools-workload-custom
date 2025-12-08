import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Badge,
} from '@fluentui/react-components';
import {
  Play24Regular,
  Pause24Regular,
  ArrowReset24Regular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground2,
    padding: '20px',
    gap: '16px',
  },
  gameArea: {
    position: 'relative',
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    overflow: 'hidden',
  },
  canvas: {
    display: 'block',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #F25022 0%, #7FBA00 25%, #00A4EF 50%, #FFB900 75%, #F25022 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  scoreBoard: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  controls: {
    display: 'flex',
    gap: '8px',
  },
  instructions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    color: tokens.colorNeutralForeground3,
    fontSize: '12px',
  },
  competitorLegend: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: '600px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
  },
  descriptionPanel: {
    marginTop: '16px',
    padding: '20px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '8px',
    maxWidth: '600px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  descriptionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
    color: tokens.colorNeutralForeground1,
  },
  descriptionText: {
    fontSize: '13px',
    lineHeight: '1.6',
    color: tokens.colorNeutralForeground2,
  },
  descriptionList: {
    margin: '8px 0',
    paddingLeft: '20px',
  },
  gameOver: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: '32px 48px',
    borderRadius: '12px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  gameOverTitle: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#F25022',
  },
  gameOverScore: {
    fontSize: '18px',
    color: 'white',
  },
});

// Competing products data with colors for icons (sorted by points)
const COMPETITORS = [
  { name: 'AWS Redshift', color: '#FF9900', letter: 'A', points: 20 },
  { name: 'GCP BigQuery', color: '#4285F4', letter: 'G', points: 20 },
  { name: 'Snowflake', color: '#29B5E8', letter: 'S', points: 15 },
  { name: 'SAP Datasphere', color: '#0FAAFF', letter: 'P', points: 12 },
  { name: 'Oracle Analytics', color: '#F80000', letter: 'O', points: 10 },
  { name: 'Informatica', color: '#FF6D00', letter: 'I', points: 8 },
  { name: 'Teradata Vantage', color: '#F37440', letter: 'T', points: 6 },
  { name: 'Databricks', color: '#FF3621', letter: 'D', points: 5 },
];

// Microsoft Fabric gradient colors
const FABRIC_COLORS = [
  '#F25022', // Red
  '#7FBA00', // Green
  '#00A4EF', // Blue  
  '#FFB900', // Yellow
];

interface Position {
  x: number;
  y: number;
}

interface Food {
  position: Position;
  competitor: typeof COMPETITORS[0];
}

interface SnakeGameProps {
  onScoreUpdate?: (score: number, highScore: number, competitorsEaten: number) => void;
  initialHighScore?: number;
}

const CELL_SIZE = 20;
const GRID_WIDTH = 30;
const GRID_HEIGHT = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREASE = 5;
const MIN_SPEED = 50;

export const SnakeGame: React.FC<SnakeGameProps> = ({ onScoreUpdate, initialHighScore = 0 }) => {
  const styles = useStyles();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [snake, setSnake] = useState<Position[]>([{ x: 15, y: 10 }]);
  const [direction, setDirection] = useState<Position>({ x: 1, y: 0 });
  const [food, setFood] = useState<Food | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(initialHighScore);
  const [competitorsEaten, setCompetitorsEaten] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  
  const directionRef = useRef(direction);
  const snakeRef = useRef(snake);
  
  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);
  
  useEffect(() => {
    snakeRef.current = snake;
  }, [snake]);

  const generateFood = useCallback((): Food => {
    let newPosition: Position;
    do {
      newPosition = {
        x: Math.floor(Math.random() * GRID_WIDTH),
        y: Math.floor(Math.random() * GRID_HEIGHT),
      };
    } while (snakeRef.current.some(segment => segment.x === newPosition.x && segment.y === newPosition.y));
    
    const competitor = COMPETITORS[Math.floor(Math.random() * COMPETITORS.length)];
    return { position: newPosition, competitor };
  }, []);

  const resetGame = useCallback(() => {
    setSnake([{ x: 15, y: 10 }]);
    setDirection({ x: 1, y: 0 });
    setScore(0);
    setCompetitorsEaten(0);
    setIsGameOver(false);
    setSpeed(INITIAL_SPEED);
    setFood(generateFood());
  }, [generateFood]);

  const startGame = useCallback(() => {
    if (isGameOver) {
      resetGame();
    }
    if (!food) {
      setFood(generateFood());
    }
    setIsPlaying(true);
  }, [isGameOver, food, resetGame, generateFood]);

  const pauseGame = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for game keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (!isPlaying && !isGameOver && (e.key === ' ' || e.key === 'Enter')) {
        startGame();
        return;
      }
      
      const currentDir = directionRef.current;
      
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (currentDir.y !== 1) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (currentDir.y !== -1) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (currentDir.x !== 1) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (currentDir.x !== -1) setDirection({ x: 1, y: 0 });
          break;
        case ' ':
          if (isPlaying) pauseGame();
          else if (!isGameOver) startGame();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isGameOver, startGame, pauseGame]);

  // Game loop
  useEffect(() => {
    if (!isPlaying || isGameOver) return undefined;

    const gameLoop = setInterval(() => {
      setSnake(prevSnake => {
        const head = prevSnake[0];
        const dir = directionRef.current;
        const newHead: Position = {
          x: head.x + dir.x,
          y: head.y + dir.y,
        };

        // Check wall collision
        if (newHead.x < 0 || newHead.x >= GRID_WIDTH || newHead.y < 0 || newHead.y >= GRID_HEIGHT) {
          setIsGameOver(true);
          setIsPlaying(false);
          return prevSnake;
        }

        // Check self collision
        if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
          setIsGameOver(true);
          setIsPlaying(false);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Check food collision
        if (food && newHead.x === food.position.x && newHead.y === food.position.y) {
          const points = food.competitor.points;
          setScore(prev => {
            const newScore = prev + points;
            if (newScore > highScore) {
              setHighScore(newScore);
            }
            return newScore;
          });
          setCompetitorsEaten(prev => prev + 1);
          setSpeed(prev => Math.max(MIN_SPEED, prev - SPEED_INCREASE));
          setFood(generateFood());
          // Don't remove tail - snake grows
          return newSnake;
        }

        // Remove tail if no food eaten
        newSnake.pop();
        return newSnake;
      });
    }, speed);

    return () => clearInterval(gameLoop);
  }, [isPlaying, isGameOver, food, speed, highScore, generateFood]);

  // Notify parent of score updates
  useEffect(() => {
    onScoreUpdate?.(score, highScore, competitorsEaten);
  }, [score, highScore, competitorsEaten, onScoreUpdate]);

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= GRID_WIDTH; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL_SIZE, 0);
      ctx.lineTo(x * CELL_SIZE, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= GRID_HEIGHT; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL_SIZE);
      ctx.lineTo(canvas.width, y * CELL_SIZE);
      ctx.stroke();
    }

    // Draw snake with Fabric gradient colors
    snake.forEach((segment, index) => {
      const colorIndex = index % FABRIC_COLORS.length;
      const color = FABRIC_COLORS[colorIndex];
      
      // Create gradient effect for each segment
      const gradient = ctx.createRadialGradient(
        segment.x * CELL_SIZE + CELL_SIZE / 2,
        segment.y * CELL_SIZE + CELL_SIZE / 2,
        0,
        segment.x * CELL_SIZE + CELL_SIZE / 2,
        segment.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2
      );
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, shadeColor(color, -30));
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(
        segment.x * CELL_SIZE + 1,
        segment.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2,
        4
      );
      ctx.fill();

      // Draw eyes on head
      if (index === 0) {
        ctx.fillStyle = 'white';
        const eyeSize = 4;
        const eyeOffset = 5;
        
        if (directionRef.current.x === 1) {
          ctx.beginPath();
          ctx.arc(segment.x * CELL_SIZE + CELL_SIZE - eyeOffset, segment.y * CELL_SIZE + eyeOffset, eyeSize, 0, Math.PI * 2);
          ctx.arc(segment.x * CELL_SIZE + CELL_SIZE - eyeOffset, segment.y * CELL_SIZE + CELL_SIZE - eyeOffset, eyeSize, 0, Math.PI * 2);
          ctx.fill();
        } else if (directionRef.current.x === -1) {
          ctx.beginPath();
          ctx.arc(segment.x * CELL_SIZE + eyeOffset, segment.y * CELL_SIZE + eyeOffset, eyeSize, 0, Math.PI * 2);
          ctx.arc(segment.x * CELL_SIZE + eyeOffset, segment.y * CELL_SIZE + CELL_SIZE - eyeOffset, eyeSize, 0, Math.PI * 2);
          ctx.fill();
        } else if (directionRef.current.y === -1) {
          ctx.beginPath();
          ctx.arc(segment.x * CELL_SIZE + eyeOffset, segment.y * CELL_SIZE + eyeOffset, eyeSize, 0, Math.PI * 2);
          ctx.arc(segment.x * CELL_SIZE + CELL_SIZE - eyeOffset, segment.y * CELL_SIZE + eyeOffset, eyeSize, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(segment.x * CELL_SIZE + eyeOffset, segment.y * CELL_SIZE + CELL_SIZE - eyeOffset, eyeSize, 0, Math.PI * 2);
          ctx.arc(segment.x * CELL_SIZE + CELL_SIZE - eyeOffset, segment.y * CELL_SIZE + CELL_SIZE - eyeOffset, eyeSize, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw pupils
        ctx.fillStyle = 'black';
        const pupilSize = 2;
        if (directionRef.current.x === 1) {
          ctx.beginPath();
          ctx.arc(segment.x * CELL_SIZE + CELL_SIZE - eyeOffset + 1, segment.y * CELL_SIZE + eyeOffset, pupilSize, 0, Math.PI * 2);
          ctx.arc(segment.x * CELL_SIZE + CELL_SIZE - eyeOffset + 1, segment.y * CELL_SIZE + CELL_SIZE - eyeOffset, pupilSize, 0, Math.PI * 2);
          ctx.fill();
        } else if (directionRef.current.x === -1) {
          ctx.beginPath();
          ctx.arc(segment.x * CELL_SIZE + eyeOffset - 1, segment.y * CELL_SIZE + eyeOffset, pupilSize, 0, Math.PI * 2);
          ctx.arc(segment.x * CELL_SIZE + eyeOffset - 1, segment.y * CELL_SIZE + CELL_SIZE - eyeOffset, pupilSize, 0, Math.PI * 2);
          ctx.fill();
        } else if (directionRef.current.y === -1) {
          ctx.beginPath();
          ctx.arc(segment.x * CELL_SIZE + eyeOffset, segment.y * CELL_SIZE + eyeOffset - 1, pupilSize, 0, Math.PI * 2);
          ctx.arc(segment.x * CELL_SIZE + CELL_SIZE - eyeOffset, segment.y * CELL_SIZE + eyeOffset - 1, pupilSize, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(segment.x * CELL_SIZE + eyeOffset, segment.y * CELL_SIZE + CELL_SIZE - eyeOffset + 1, pupilSize, 0, Math.PI * 2);
          ctx.arc(segment.x * CELL_SIZE + CELL_SIZE - eyeOffset, segment.y * CELL_SIZE + CELL_SIZE - eyeOffset + 1, pupilSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });

    // Draw food (competitor icon)
    if (food) {
      const { position, competitor } = food;
      
      // Draw circular background with competitor color
      const gradient = ctx.createRadialGradient(
        position.x * CELL_SIZE + CELL_SIZE / 2,
        position.y * CELL_SIZE + CELL_SIZE / 2,
        0,
        position.x * CELL_SIZE + CELL_SIZE / 2,
        position.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2
      );
      gradient.addColorStop(0, competitor.color);
      gradient.addColorStop(1, shadeColor(competitor.color, -20));
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(
        position.x * CELL_SIZE + CELL_SIZE / 2,
        position.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2 - 2,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Draw letter
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        competitor.letter,
        position.x * CELL_SIZE + CELL_SIZE / 2,
        position.y * CELL_SIZE + CELL_SIZE / 2
      );

      // Add glow effect
      ctx.shadowColor = competitor.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(
        position.x * CELL_SIZE + CELL_SIZE / 2,
        position.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2 - 2,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw start message if not started
    if (!isPlaying && !isGameOver && snake.length === 1) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = 'white';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🐍 Fabric Snake', canvas.width / 2, canvas.height / 2 - 30);
      
      ctx.font = '16px Arial';
      ctx.fillText('Eat the competing products!', canvas.width / 2, canvas.height / 2 + 10);
      
      ctx.font = '14px Arial';
      ctx.fillStyle = '#00A4EF';
      ctx.fillText('Press SPACE or click Play to start', canvas.width / 2, canvas.height / 2 + 50);
    }

  }, [snake, food, isPlaying, isGameOver]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text className={styles.title}>🐍 Fabric Snake</Text>
        <div className={styles.scoreBoard}>
          <Badge appearance="filled" color="success">Score: {score}</Badge>
          <Badge appearance="filled" color="important">High Score: {highScore}</Badge>
          <Badge appearance="filled" color="informative">Eaten: {competitorsEaten}</Badge>
        </div>
      </div>

      <div className={styles.controls}>
        {!isPlaying ? (
          <Button 
            appearance="primary" 
            icon={<Play24Regular />}
            onClick={startGame}
          >
            {isGameOver ? 'Play Again' : 'Play'}
          </Button>
        ) : (
          <Button 
            appearance="secondary" 
            icon={<Pause24Regular />}
            onClick={pauseGame}
          >
            Pause
          </Button>
        )}
        <Button 
          appearance="secondary" 
          icon={<ArrowReset24Regular />}
          onClick={resetGame}
        >
          Reset
        </Button>
      </div>

      <div className={styles.gameArea}>
        <canvas
          ref={canvasRef}
          width={GRID_WIDTH * CELL_SIZE}
          height={GRID_HEIGHT * CELL_SIZE}
          className={styles.canvas}
        />
        {isGameOver && (
          <div className={styles.gameOver}>
            <Text className={styles.gameOverTitle}>Game Over!</Text>
            <Text className={styles.gameOverScore}>
              Final Score: {score}<br />
              Products Eaten: {competitorsEaten}
            </Text>
            <Button appearance="primary" onClick={startGame}>
              Play Again
            </Button>
          </div>
        )}
      </div>

      <div className={styles.instructions}>
        <Text>Use Arrow Keys or WASD to move • Space to Pause</Text>
      </div>

      <div className={styles.competitorLegend}>
        {COMPETITORS.map(comp => (
          <div key={comp.name} className={styles.legendItem}>
            <span style={{ 
              display: 'inline-block', 
              width: '14px', 
              height: '14px', 
              borderRadius: '50%', 
              backgroundColor: comp.color,
              textAlign: 'center',
              lineHeight: '14px',
              fontSize: '9px',
              color: 'white',
              fontWeight: 'bold'
            }}>
              {comp.letter}
            </span>
            <span>{comp.name} (+{comp.points})</span>
          </div>
        ))}
      </div>

      {/* Game Description */}
      <div className={styles.descriptionPanel}>
        <Text className={styles.descriptionTitle}>🐍 About Fabric Snake</Text>
        <Text className={styles.descriptionText}>
          <strong>Microsoft Fabric</strong> is hungry for market share! Guide the Fabric-colored snake 
          to consume competing data platform products and grow your enterprise data estate.
        </Text>
        <ul className={styles.descriptionList} style={{ color: tokens.colorNeutralForeground2, fontSize: '13px' }}>
          <li><strong>Objective:</strong> Eat as many competing product icons as possible without hitting walls or yourself</li>
          <li><strong>Snake Colors:</strong> The snake displays Microsoft Fabric's signature gradient (Red → Green → Blue → Yellow)</li>
          <li><strong>Competing Products:</strong> AWS Redshift, GCP BigQuery, Snowflake, SAP Datasphere, Oracle Analytics, Informatica, Teradata Vantage, and Databricks</li>
          <li><strong>Scoring:</strong> Points reflect market position - cloud giants AWS Redshift & GCP BigQuery are worth the most!</li>
          <li><strong>Speed:</strong> The game speeds up as you eat more products - just like real market competition!</li>
        </ul>
        <Text className={styles.descriptionText} style={{ marginTop: '8px', fontStyle: 'italic' }}>
          💡 Pro tip: Focus on high-value targets like AWS Redshift (+20) and GCP BigQuery (+20) to maximize your score!
        </Text>
        <Text className={styles.descriptionText} style={{ marginTop: '12px', fontSize: '11px', color: tokens.colorNeutralForeground4 }}>
          🤖 This game was entirely AI-generated using GitHub Copilot in VS Code.
        </Text>
      </div>
    </div>
  );
};

// Helper function to shade colors
function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
}

export default SnakeGame;
