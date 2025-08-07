// 游戏状态管理
let gameState = {
    currentRound: 1,
    gameHistory: [],
    currentAIGesture: null,
    gameStarted: false,
    aiPredictionModel: {
        patterns: {
            consecutiveChoices: [],
            afterWin: { scissors: 0, rock: 0, paper: 0 },
            afterLose: { scissors: 0, rock: 0, paper: 0 },
            afterDraw: { scissors: 0, rock: 0, paper: 0 },
            overallFrequency: { scissors: 0, rock: 0, paper: 0 }
        },
        weights: {
            consecutive: 0.3,
            afterResult: 0.4,
            frequency: 0.3
        }
    }
};

// 手势映射
const gestureMap = {
    'scissors': { name: 'Scissors', image: 'img/scissors.png', beats: 'paper', beatenBy: 'rock' },
    'rock': { name: 'Rock', image: 'img/rock.png', beats: 'scissors', beatenBy: 'paper' },
    'paper': { name: 'Paper', image: 'img/paper.png', beats: 'rock', beatenBy: 'scissors' }
};

// 主题状态
let currentTheme = 'light';

// 初始化游戏
document.addEventListener('DOMContentLoaded', function () {
    updateRoundDisplay();
    addWelcomeMessage();
    loadTheme();

    // 确保结果按钮容器可见
    const resultControls = document.getElementById('result-controls');
    if (resultControls) {
        resultControls.style.display = 'flex';
        resultControls.style.visibility = 'visible';
        resultControls.style.opacity = '1';
    }

    // 确保按钮是禁用状态但可见
    const winBtn = document.getElementById('win-btn');
    const loseBtn = document.getElementById('lose-btn');
    const drawBtn = document.getElementById('draw-btn');

    if (winBtn) {
        winBtn.disabled = true;
        winBtn.style.display = 'block';
        winBtn.style.visibility = 'visible';
    }
    if (loseBtn) {
        loseBtn.disabled = true;
        loseBtn.style.display = 'block';
        loseBtn.style.visibility = 'visible';
    }
    if (drawBtn) {
        drawBtn.disabled = true;
        drawBtn.style.display = 'block';
        drawBtn.style.visibility = 'visible';
    }
});

// 加载主题
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

// 切换主题
function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
}

// 设置主题
function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);

    const themeBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = themeBtn.querySelector('.theme-icon');

    if (theme === 'dark') {
        themeIcon.textContent = '☀️';
        themeIcon.title = 'Switch to Light Mode';
    } else {
        themeIcon.textContent = '🌙';
        themeIcon.title = 'Switch to Dark Mode';
    }
}

// 更新回合显示
function updateRoundDisplay() {
    document.getElementById('round-title').textContent = `Round ${gameState.currentRound}`;
}

// 添加欢迎消息
function addWelcomeMessage() {
    addChatMessage('AI', 'Welcome to the AI Rock Paper Scissors Game!', null);
    addChatMessage('AI', 'Please think of a gesture in your mind, then click the "Start New Game" button.', null);
}

// 开始新游戏
function startNewGame() {
    gameState.gameStarted = true;
    gameState.currentAIGesture = null;

    // 根据历史数据预测用户可能的选择
    const predictedUserGesture = predictUserGesture();

    // AI选择能够击败预测手势的手势
    gameState.currentAIGesture = getCounterGesture(predictedUserGesture);

    // 显示AI的手势
    displayAIGesture(gameState.currentAIGesture);

    // 启用结果按钮
    enableResultButtons();

    // 添加游戏开始消息
    addChatMessage('AI', `Round ${gameState.currentRound} started! I chose ${gestureMap[gameState.currentAIGesture].name}.`, gameState.currentAIGesture);
    addChatMessage('AI', 'Please tell me the result based on your gesture: Win, Lose, or Draw?', null);
}

// 预测用户可能选择的手势
function predictUserGesture() {
    if (gameState.gameHistory.length === 0) {
        return getRandomGesture();
    }

    const patterns = gameState.aiPredictionModel.patterns;
    const weights = gameState.aiPredictionModel.weights;

    const consecutiveProb = calculateConsecutiveProbability(patterns.consecutiveChoices);
    const afterResultProb = calculateAfterResultProbability(patterns);
    const frequencyProb = calculateFrequencyProbability(patterns.overallFrequency);

    const finalProb = {
        scissors: consecutiveProb.scissors * weights.consecutive +
            afterResultProb.scissors * weights.afterResult +
            frequencyProb.scissors * weights.frequency,
        rock: consecutiveProb.rock * weights.consecutive +
            afterResultProb.rock * weights.afterResult +
            frequencyProb.rock * weights.frequency,
        paper: consecutiveProb.paper * weights.consecutive +
            afterResultProb.paper * weights.afterResult +
            frequencyProb.paper * weights.frequency
    };

    return Object.keys(finalProb).reduce((a, b) => finalProb[a] > finalProb[b] ? a : b);
}

// 计算连续选择模式的概率
function calculateConsecutiveProbability(consecutiveChoices) {
    if (consecutiveChoices.length === 0) {
        return { scissors: 0.33, rock: 0.33, paper: 0.34 };
    }

    const lastChoices = consecutiveChoices.slice(-3);
    const counts = { scissors: 0, rock: 0, paper: 0 };

    lastChoices.forEach(choice => {
        if (counts.hasOwnProperty(choice)) {
            counts[choice]++;
        }
    });

    const total = lastChoices.length;
    return {
        scissors: counts.scissors / total,
        rock: counts.rock / total,
        paper: counts.paper / total
    };
}

// 计算输赢后选择模式的概率
function calculateAfterResultProbability(patterns) {
    const afterWin = patterns.afterWin;
    const afterLose = patterns.afterLose;
    const afterDraw = patterns.afterDraw;

    const totalWin = Object.values(afterWin).reduce((a, b) => a + b, 0);
    const totalLose = Object.values(afterLose).reduce((a, b) => a + b, 0);
    const totalDraw = Object.values(afterDraw).reduce((a, b) => a + b, 0);

    return {
        scissors: (afterWin.scissors / (totalWin || 1) +
            afterLose.scissors / (totalLose || 1) +
            afterDraw.scissors / (totalDraw || 1)) / 3,
        rock: (afterWin.rock / (totalWin || 1) +
            afterLose.rock / (totalLose || 1) +
            afterDraw.rock / (totalDraw || 1)) / 3,
        paper: (afterWin.paper / (totalWin || 1) +
            afterLose.paper / (totalLose || 1) +
            afterDraw.paper / (totalDraw || 1)) / 3
    };
}

// 计算总体频率概率
function calculateFrequencyProbability(overallFrequency) {
    const total = Object.values(overallFrequency).reduce((a, b) => a + b, 0);

    if (total === 0) {
        return { scissors: 0.33, rock: 0.33, paper: 0.34 };
    }

    return {
        scissors: overallFrequency.scissors / total,
        rock: overallFrequency.rock / total,
        paper: overallFrequency.paper / total
    };
}

// 获取能够击败指定手势的手势
function getCounterGesture(gesture) {
    return gestureMap[gesture].beatenBy;
}

// 获取随机手势
function getRandomGesture() {
    const gestures = ['scissors', 'rock', 'paper'];
    return gestures[Math.floor(Math.random() * gestures.length)];
}

// 显示AI手势
function displayAIGesture(gesture) {
    const gestureDisplay = document.getElementById('ai-gesture-display');
    gestureDisplay.innerHTML = `
        <img src="${gestureMap[gesture].image}" alt="${gestureMap[gesture].name}" style="width: 100px; height: 100px; object-fit: contain;">
        <p>AI选择了: ${gestureMap[gesture].name}</p>
    `;
}

// 报告游戏结果
function reportResult(result) {
    if (!gameState.gameStarted || !gameState.currentAIGesture) {
        addChatMessage('AI', '请先开始游戏！', null);
        return;
    }

    // 检查按钮是否被禁用
    const winBtn = document.getElementById('win-btn');
    if (winBtn && winBtn.disabled) {
        addChatMessage('AI', 'Game has not started yet, please click "Start New Game" first!', null);
        return;
    }

    const userGesture = inferUserGesture(gameState.currentAIGesture, result);

    const gameResult = {
        round: gameState.currentRound,
        aiGesture: gameState.currentAIGesture,
        userGesture: userGesture,
        result: result,
        timestamp: new Date().toISOString()
    };

    gameState.gameHistory.push(gameResult);
    updatePredictionModel(userGesture, result);

    addChatMessage('player', `Result: ${result}`, null);

    // 根据结果生成更明确的描述
    let resultDescription = '';
    switch (result) {
        case 'Win':
            resultDescription = `You won! You chose ${gestureMap[userGesture].name} and defeated my ${gestureMap[gameState.currentAIGesture].name}`;
            break;
        case 'Lose':
            resultDescription = `You lost! I chose ${gestureMap[gameState.currentAIGesture].name} and defeated your ${gestureMap[userGesture].name}`;
            break;
        case 'Draw':
            resultDescription = `It's a draw! We both chose ${gestureMap[gameState.currentAIGesture].name}`;
            break;
    }

    addChatMessage('AI', resultDescription, null);

    showAIAnalysis(userGesture, result);

    gameState.currentRound++;
    updateRoundDisplay();
    gameState.gameStarted = false;
    gameState.currentAIGesture = null;

    // 禁用结果按钮
    disableResultButtons();
    document.getElementById('ai-gesture-display').innerHTML = '';

    addChatMessage('AI', `Round ${gameState.currentRound - 1} ended! Click "Start New Game" to begin Round ${gameState.currentRound}.`, null);
}

// 根据AI手势和结果推断用户手势
function inferUserGesture(aiGesture, result) {
    const aiGestureInfo = gestureMap[aiGesture];

    switch (result) {
        case 'Win': // 用户赢了AI，说明用户选择了能够击败AI手势的手势
            return aiGestureInfo.beatenBy;
        case 'Lose': // 用户输给了AI，说明用户选择了被AI手势击败的手势
            return aiGestureInfo.beats;
        case 'Draw': // 平局，说明用户选择了和AI相同的手势
            return aiGesture;
        default:
            return getRandomGesture();
    }
}

// 更新AI预测模型
function updatePredictionModel(userGesture, result) {
    const patterns = gameState.aiPredictionModel.patterns;

    patterns.consecutiveChoices.push(userGesture);
    if (patterns.consecutiveChoices.length > 10) {
        patterns.consecutiveChoices.shift();
    }

    if (gameState.gameHistory.length > 1) {
        const previousResult = gameState.gameHistory[gameState.gameHistory.length - 2].result;
        switch (previousResult) {
            case 'Win':
                patterns.afterWin[userGesture]++;
                break;
            case 'Lose':
                patterns.afterLose[userGesture]++;
                break;
            case 'Draw':
                patterns.afterDraw[userGesture]++;
                break;
        }
    }

    patterns.overallFrequency[userGesture]++;
}

// 显示AI分析
function showAIAnalysis(userGesture, result) {
    const patterns = gameState.aiPredictionModel.patterns;

    let analysis = `Analyzing your decision patterns:`;

    const frequency = patterns.overallFrequency;
    const total = Object.values(frequency).reduce((a, b) => a + b, 0);
    if (total > 0) {
        analysis += `\n- You chose Scissors ${((frequency.scissors / total) * 100).toFixed(1)}%, Rock ${((frequency.rock / total) * 100).toFixed(1)}%, Paper ${((frequency.paper / total) * 100).toFixed(1)}%`;
    }

    if (patterns.consecutiveChoices.length >= 3) {
        const recent = patterns.consecutiveChoices.slice(-3);
        analysis += `\n- Last 3 choices: ${recent.map(g => gestureMap[g].name).join(' → ')}`;
    }

    addChatMessage('AI', analysis, null);
}

// 添加聊天消息
function addChatMessage(sender, message, gesture) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    const avatar = document.createElement('div');
    avatar.className = `avatar ${sender}`;

    if (sender === 'AI') {
        avatar.innerHTML = '<img src="img/AIavtar.png" alt="AI Avatar">';
    } else {
        avatar.innerHTML = '<img src="img/Default avatar.jpg" alt="Player Avatar">';
    }

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = message;

    if (gesture) {
        const gestureImg = document.createElement('img');
        gestureImg.src = gestureMap[gesture].image;
        gestureImg.alt = gestureMap[gesture].name;
        gestureImg.className = 'gesture-image';
        messageContent.appendChild(gestureImg);
    }

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    chatMessages.appendChild(messageDiv);

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 启用结果按钮
function enableResultButtons() {
    const winBtn = document.getElementById('win-btn');
    const loseBtn = document.getElementById('lose-btn');
    const drawBtn = document.getElementById('draw-btn');

    if (winBtn) winBtn.disabled = false;
    if (loseBtn) loseBtn.disabled = false;
    if (drawBtn) drawBtn.disabled = false;
}

// 禁用结果按钮
function disableResultButtons() {
    const winBtn = document.getElementById('win-btn');
    const loseBtn = document.getElementById('lose-btn');
    const drawBtn = document.getElementById('draw-btn');

    if (winBtn) winBtn.disabled = true;
    if (loseBtn) loseBtn.disabled = true;
    if (drawBtn) drawBtn.disabled = true;
}

// 重置游戏
function resetGame() {
    gameState.currentRound = 1;
    gameState.gameHistory = [];
    gameState.currentAIGesture = null;
    gameState.gameStarted = false;
    gameState.aiPredictionModel = {
        patterns: {
            consecutiveChoices: [],
            afterWin: { scissors: 0, rock: 0, paper: 0 },
            afterLose: { scissors: 0, rock: 0, paper: 0 },
            afterDraw: { scissors: 0, rock: 0, paper: 0 },
            overallFrequency: { scissors: 0, rock: 0, paper: 0 }
        },
        weights: {
            consecutive: 0.3,
            afterResult: 0.4,
            frequency: 0.3
        }
    };

    updateRoundDisplay();
    // 禁用结果按钮
    disableResultButtons();
    document.getElementById('ai-gesture-display').innerHTML = '';

    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';

    addWelcomeMessage();
} 