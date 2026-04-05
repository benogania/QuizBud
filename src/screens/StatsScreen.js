import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Animated, Dimensions } from 'react-native';
import { useQuizStore } from '../store/useQuizStore';
import { generateStudyRecommendation } from '../services/geminiService';

import { 
  ArrowTrendingUpIcon, 
  BeakerIcon, 
  CalculatorIcon,      
  BookOpenIcon,
  SparklesIcon,
  AcademicCapIcon
} from 'react-native-heroicons/solid';

// --- CUSTOM ANIMATED NUMBER COMPONENT ---
const AnimatedNumber = ({ value, format, trigger, textClass }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!trigger) return;
    let start = 0;
    const duration = 1500; // 1.5 seconds to count up
    const end = parseFloat(value) || 0;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4); // easeOutQuart
      setDisplayValue(start + (end - start) * easeProgress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [value, trigger]);

  let formatted = Math.round(displayValue);
  if (format === 'hours') formatted = displayValue.toFixed(1);

  return (
    <Text className={textClass}>
      {formatted}{format === 'percent' ? '%' : format === 'hours' ? 'h' : ''}
    </Text>
  );
};

export default function StatsScreen() {
  const { 
    quizHistory = [], 
    quizzes = [], 
    theme, 
    aiStatsInsight, 
    lastStatsFetch, 
    setAiStatsInsight 
  } = useQuizStore();
  
  const isDark = theme === 'dark';
  const [viewMode, setViewMode] = useState('weekly'); 

  // --- ANIMATION STATES ---
  const graphAnim = useRef(new Animated.Value(0)).current;
  const habitsAnim = useRef(new Animated.Value(0)).current;

  const [triggerMetrics, setTriggerMetrics] = useState(false);
  const [triggerHabits, setTriggerHabits] = useState(false);

  const [metricsY, setMetricsY] = useState(9999);
  const [habitsY, setHabitsY] = useState(9999);
  const windowHeight = Dimensions.get('window').height;

  // Trigger Graph animations immediately (or on ViewMode change)
  useEffect(() => {
    graphAnim.setValue(0);
    Animated.timing(graphAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: false, // Must be false for height interpolation
    }).start();
  }, [viewMode]);

  // Handle Initial Layout Visibility (If screen is big enough to see without scrolling)
  useEffect(() => {
    if (windowHeight >= metricsY && !triggerMetrics) setTriggerMetrics(true);
    if (windowHeight >= habitsY && !triggerHabits) {
      setTriggerHabits(true);
      Animated.timing(habitsAnim, { toValue: 1, duration: 1200, useNativeDriver: false }).start();
    }
  }, [metricsY, habitsY]);

  // Handle Scroll Visibility
  const handleScroll = (e) => {
    const scrollY = e.nativeEvent.contentOffset.y;
    const bottomOfScreen = scrollY + windowHeight - 100; // 100px buffer before triggering

    if (bottomOfScreen >= metricsY && !triggerMetrics) {
      setTriggerMetrics(true);
    }
    if (bottomOfScreen >= habitsY && !triggerHabits) {
      setTriggerHabits(true);
      Animated.timing(habitsAnim, { toValue: 1, duration: 1200, useNativeDriver: false }).start();
    }
  };

  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [aiInsight, setAiInsight] = useState(aiStatsInsight || {
    title: "Analyzing...",
    message: "Gemini is reviewing your data.",
    recommendation: "Please wait."
  });

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonthIndex = new Date().getMonth();
  const previousMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1; 

  const currentMonthName = monthNames[currentMonthIndex];
  const previousMonthName = monthNames[previousMonthIndex];

  // --- DATA PROCESSING LOGIC ---
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    
    const thisMonthData = quizHistory.filter(h => new Date(h.date).getMonth() === currentMonth);
    const lastMonthData = quizHistory.filter(h => new Date(h.date).getMonth() === currentMonth - 1);

    const calculateMetrics = (data) => {
      const totalQuizzes = data.length;
      if (totalQuizzes === 0) return { accuracy: 0, count: 0, hours: 0, minutes: 0 };

      const totalScore = data.reduce((sum, q) => sum + q.score, 0);
      const totalPossible = data.reduce((sum, q) => sum + q.totalPoints, 0);
      const totalTime = data.reduce((sum, q) => sum + (q.timeSpent || 300), 0); 

      return {
        accuracy: totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0,
        count: totalQuizzes,
        hours: (totalTime / 3600).toFixed(1),
        minutes: Math.round(totalTime / 60)
      };
    };

    const current = calculateMetrics(thisMonthData);
    const previous = calculateMetrics(lastMonthData);

    const currentDayOfWeek = now.getDay(); 
    const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const weekTemplate = [
      { id: 1, label: 'MON', accuracy: 0, isToday: currentDayOfWeek === 1 },
      { id: 2, label: 'TUE', accuracy: 0, isToday: currentDayOfWeek === 2 },
      { id: 3, label: 'WED', accuracy: 0, isToday: currentDayOfWeek === 3 },
      { id: 4, label: 'THU', accuracy: 0, isToday: currentDayOfWeek === 4 },
      { id: 5, label: 'FRI', accuracy: 0, isToday: currentDayOfWeek === 5 },
      { id: 6, label: 'SAT', accuracy: 0, isToday: currentDayOfWeek === 6 },
      { id: 0, label: 'SUN', accuracy: 0, isToday: currentDayOfWeek === 0 },
    ];

    const weeklyProgress = weekTemplate.map(day => {
      const dayHistory = quizHistory.filter(h => {
        const d = new Date(h.date);
        return d >= startOfWeek && d.getDay() === day.id;
      });

      const dayScore = dayHistory.reduce((sum, q) => sum + q.score, 0);
      const dayPossible = dayHistory.reduce((sum, q) => sum + q.totalPoints, 0);
      
      return {
        ...day,
        accuracy: dayPossible > 0 ? (dayScore / dayPossible) * 100 : 0
      };
    });

    const subjectMap = {};

    const getUpToDateSubject = (historyRecord) => {
      const liveQuizItem = quizzes.find(item => {
        const liveData = item.quiz || item;
        const matchById = historyRecord.originalQuiz?.id && liveData.id === historyRecord.originalQuiz.id;
        const matchByTitle = liveData.title === historyRecord.quizTitle; 
        return matchById || matchByTitle;
      });
      
      const liveQuizData = liveQuizItem ? (liveQuizItem.quiz || liveQuizItem) : null;
      const liveSubject = liveQuizData?.subject?.trim();
      const historySubject = historyRecord.originalQuiz?.subject?.trim();

      return liveSubject || historySubject || 'Uncategorized';
    };

    lastMonthData.forEach(q => {
      const subjectName = getUpToDateSubject(q); 
      if (!subjectMap[subjectName]) subjectMap[subjectName] = { currentScore: 0, currentTotal: 0, prevScore: 0, prevTotal: 0 };
      subjectMap[subjectName].prevScore += q.score;
      subjectMap[subjectName].prevTotal += q.totalPoints;
    });

    thisMonthData.forEach(q => {
      const subjectName = getUpToDateSubject(q); 
      if (!subjectMap[subjectName]) subjectMap[subjectName] = { currentScore: 0, currentTotal: 0, prevScore: 0, prevTotal: 0 };
      subjectMap[subjectName].currentScore += q.score;
      subjectMap[subjectName].currentTotal += q.totalPoints;
    });

    const subjectPerformance = Object.keys(subjectMap)
      .filter(sub => subjectMap[sub].currentTotal > 0) 
      .map(sub => {
        const d = subjectMap[sub];
        const mastery = (d.currentScore / d.currentTotal) * 100;
        const prevMastery = d.prevTotal > 0 ? (d.prevScore / d.prevTotal) * 100 : null;
        const trend = prevMastery !== null ? mastery - prevMastery : null;

        return {
          title: sub,
          mastery: Math.round(mastery),
          trend: trend !== null ? Math.round(trend) : null
        };
      })
      .sort((a, b) => b.mastery - a.mastery); 

    return { current, previous, weeklyProgress, subjectPerformance };
  }, [quizHistory, quizzes]); 

  // --- OPTIMIZED AI FETCH LOGIC ---
  useEffect(() => {
    const fetchInsight = async () => {
      const today = new Date().toDateString();

      if (quizHistory.length === 0) {
        setAiInsight({
          title: "Welcome to QuizBud!",
          message: "You haven't taken any quizzes yet. Start playing to unlock deep insights and personalized study plans.",
          recommendation: "Head over to the Library to create or play a quiz."
        });
        setIsGeneratingInsight(false);
        return;
      }

      if (aiStatsInsight && lastStatsFetch === today) {
        setAiInsight(aiStatsInsight); 
        setIsGeneratingInsight(false);
        return;
      }

      setIsGeneratingInsight(true);
      try {
        const summaryForAI = {
          currentAccuracy: `${Math.round(stats.current.accuracy)}%`,
          previousAccuracy: `${Math.round(stats.previous.accuracy)}%`,
          quizzesTakenThisMonth: stats.current.count,
          topSubjects: stats.subjectPerformance.slice(0, 3)
        };

        const result = await generateStudyRecommendation(summaryForAI);
        
        if (setAiStatsInsight) {
            setAiStatsInsight(result);
        }
        setAiInsight(result);
      } catch (error) {
        setAiInsight({
          title: "Keep up the hard work!",
          message: "Your progress is steady. Focus on reviewing subjects where your mastery is below 70%.",
          recommendation: "Consistency is your best teacher!"
        });
      } finally {
        setIsGeneratingInsight(false);
      }
    };

    fetchInsight();
  }, [quizHistory.length]); 

  const subjectIcons = [BeakerIcon, CalculatorIcon, BookOpenIcon, AcademicCapIcon];

  return (
    <View className={`flex-1 pt-12 ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>

      <ScrollView 
        className="px-6" 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 100 }}
        onScroll={handleScroll}
        scrollEventThrottle={16} // Fires smoothly for the scroll listener
      >
        
        <Text className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-indigo-400' : 'text-blue-600'}`}>Academic Analytics</Text>
        <Text className={`text-4xl font-black mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Your Stats</Text>

        {/* Weekly / Monthly Toggle */}
        <View className={`p-1.5 rounded-full flex-row mb-8 shadow-inner ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <TouchableOpacity 
            onPress={() => setViewMode('weekly')}
            className={`flex-1 py-3 items-center rounded-full ${viewMode === 'weekly' ? (isDark ? 'bg-gray-700' : 'bg-white shadow-sm') : ''}`}
          >
            <Text className={`font-bold ${viewMode === 'weekly' ? (isDark ? 'text-indigo-300' : 'text-blue-900') : (isDark ? 'text-gray-500' : 'text-gray-500')}`}>Weekly</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setViewMode('monthly')}
            className={`flex-1 py-3 items-center rounded-full ${viewMode === 'monthly' ? (isDark ? 'bg-gray-700' : 'bg-white shadow-sm') : ''}`}
          >
            <Text className={`font-bold ${viewMode === 'monthly' ? (isDark ? 'text-indigo-300' : 'text-blue-900') : (isDark ? 'text-gray-500' : 'text-gray-500')}`}>Monthly</Text>
          </TouchableOpacity>
        </View>

        {/* --- ANIMATED CHART VIEWS --- */}
        {viewMode === 'weekly' ? (
          <View className={`rounded-[40px] p-8 shadow-sm mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <Text className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Learning Journey</Text>
            <Text className={`text-sm mt-1 mb-10 leading-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Overall mastery progress for the current week</Text>

            <View className="flex-row justify-between items-end h-48 relative">
              <View className="absolute w-full h-full justify-between pb-6 opacity-30">
                <View className={`border-b-2 border-dashed w-full ${isDark ? 'border-gray-600' : 'border-gray-200'}`} />
                <View className={`border-b-2 border-dashed w-full ${isDark ? 'border-gray-600' : 'border-gray-200'}`} />
                <View className={`border-b-2 border-dashed w-full ${isDark ? 'border-gray-600' : 'border-gray-200'}`} />
              </View>

              {stats.weeklyProgress.map((day) => (
                <View key={day.label} className="items-center z-10 flex-1">
                  <Animated.View 
                    className={`w-8 rounded-t-xl ${day.isToday ? (isDark ? 'bg-indigo-400' : 'bg-[#283593]') : (isDark ? 'bg-gray-700' : 'bg-[#e8eaf6]')}`}
                    style={{ 
                      height: graphAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', `${Math.max(day.accuracy, 15)}%`]
                      }) 
                    }}
                  />
                  <Text className={`text-[9px] mt-4 font-bold tracking-wider ${day.isToday ? (isDark ? 'text-indigo-300' : 'text-gray-900') : 'text-gray-400'}`}>
                    {day.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View className={`rounded-[40px] p-8 shadow-sm mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <View className="flex-row justify-between items-start mb-6">
              <View>
                <Text className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Mastery Growth</Text>
                <Text className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Change in curriculum</Text>
              </View>
              <View className={`${isDark ? 'bg-orange-900/30' : 'bg-orange-100'} px-3 py-2 rounded-full flex-row items-center`}>
                <ArrowTrendingUpIcon color="#f59e0b" size={14} />
                <Text className="text-orange-600 font-bold text-[10px] ml-1">
                  {stats.current.accuracy >= stats.previous.accuracy ? '+' : ''}{Math.round(stats.current.accuracy - stats.previous.accuracy)}%
                </Text>
              </View>
            </View>

            <View className="flex-row justify-around items-end h-40">
              <View className="items-center w-24">
                <AnimatedNumber trigger={true} value={stats.previous.accuracy} format="percent" textClass={`font-bold mb-2 text-lg ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <Animated.View 
                  className={`${isDark ? 'bg-indigo-900/50' : 'bg-[#9fa8da]'} w-20 rounded-t-[32px] opacity-80`} 
                  style={{ 
                    height: graphAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${Math.max(stats.previous.accuracy, 10)}%`] }) 
                  }} 
                />
                <Text className="text-gray-400 text-[10px] mt-3 font-bold uppercase text-center">{previousMonthName}</Text>
              </View>
              <View className="items-center w-24">
                <AnimatedNumber trigger={true} value={stats.current.accuracy} format="percent" textClass={`${isDark ? 'text-indigo-300' : 'text-[#283593]'} font-black text-3xl mb-2`} />
                <Animated.View 
                  className={`${isDark ? 'bg-indigo-500' : 'bg-[#283593]'} w-20 rounded-t-[32px]`} 
                  style={{ 
                    height: graphAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${Math.max(stats.current.accuracy, 10)}%`] }) 
                  }} 
                />
                <Text className={`${isDark ? 'text-indigo-300' : 'text-[#283593]'} text-[10px] mt-3 font-bold uppercase text-center`}>{currentMonthName}</Text>
              </View>
            </View>
          </View>
        )}

        {/* AI Insight Card (Cached) */}
        <View className="bg-[#2a41d0] rounded-[40px] p-8 mb-6 shadow-md shadow-indigo-200">
          <View className="flex-row justify-between items-start">
            <SparklesIcon color="white" size={30} />
            {isGeneratingInsight && <ActivityIndicator color="white" size="small" />}
          </View>
          <Text className="text-white text-2xl font-black mt-4">{aiInsight.title}</Text>
          <Text className="text-indigo-100 mt-4 leading-6">
            {aiInsight.message}
          </Text>
          <View className="h-[1px] bg-indigo-500/50 my-6" />
          <View className="flex-row items-center">
            <View className="w-12 h-12 rounded-full bg-blue-400/80 mr-3 justify-center items-center">
                <SparklesIcon color="white" size={20} />
            </View>
            <View className="flex-1">
              <Text className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-1">Study Recommendation</Text>
              <Text className="text-white font-bold leading-5">{aiInsight.recommendation}</Text>
            </View>
          </View>
        </View>

        {/* --- SCROLL-TRIGGERED METRIC BOXES --- */}
        <View 
          onLayout={(e) => setMetricsY(e.nativeEvent.layout.y)}
          className={`rounded-[40px] p-6 flex-row flex-wrap mb-6 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}
        >
          <MetricBox 
            trigger={triggerMetrics}
            isDark={isDark} 
            label="AVG Accuracy" 
            format="percent"
            value={stats.current.accuracy} 
            trend={`${stats.current.accuracy >= stats.previous.accuracy ? '+' : ''}${(stats.current.accuracy - stats.previous.accuracy).toFixed(1)}%`} 
          />
          <MetricBox 
            trigger={triggerMetrics}
            isDark={isDark} 
            label="Quizzes Taken" 
            format="number"
            value={stats.current.count} 
            trend={`${stats.current.count >= stats.previous.count ? '+' : ''}${Math.round((stats.current.count - stats.previous.count))}`} 
          />
          <MetricBox 
            trigger={triggerMetrics}
            isDark={isDark} 
            label="Total Hours" 
            format="hours"
            value={stats.current.hours} 
            trend={`${stats.current.hours >= stats.previous.hours ? '+' : ''}${(stats.current.hours - stats.previous.hours).toFixed(1)}h`} 
          />
        </View>

        <Text className={`text-lg font-black mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>Subject Performance</Text>
        
        {stats.subjectPerformance.length === 0 ? (
          <View className={`p-6 rounded-3xl border mb-6 items-center ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <Text className="text-gray-400 text-center">Complete some quizzes with subjects to see your performance breakdown!</Text>
          </View>
        ) : (
          stats.subjectPerformance.map((sub, index) => {
            const Icon = subjectIcons[index % subjectIcons.length]; 
            let trendText = 'New';
            let trendColor = isDark ? 'text-gray-400' : 'text-gray-500';
            let trendBg = isDark ? 'bg-gray-700' : 'bg-gray-100';
            
            if (sub.trend !== null) {
              if (sub.trend > 0) {
                trendText = `+${sub.trend}%`;
                trendColor = 'text-green-400';
                trendBg = isDark ? 'bg-green-900/30' : 'bg-green-100';
              } else if (sub.trend < 0) {
                trendText = `${sub.trend}%`;
                trendColor = 'text-red-400';
                trendBg = isDark ? 'bg-red-900/30' : 'bg-red-100';
              }
            }

            return (
              <View key={sub.title} className={`rounded-3xl p-4 flex-row items-center mb-3 shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <View className={`p-3 rounded-2xl ${isDark ? 'bg-indigo-900/50' : 'bg-blue-50'}`}>
                  <Icon color={isDark ? "#818cf8" : "#1e3a8a"} size={20} />
                </View>
                <View className="flex-1 ml-4">
                  <Text className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{sub.title}</Text>
                  <Text className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{sub.mastery}% Mastery</Text>
                </View>
                <View className={`${trendBg} px-3 py-1 rounded-full`}>
                  <Text className={`${trendColor} font-bold text-[10px]`}>{trendText}</Text>
                </View>
              </View>
            );
          })
        )}

        {/* --- SCROLL-TRIGGERED STUDY HABITS --- */}
        <Text className={`text-lg font-black mt-8 mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>Study Habits</Text>
        
        <View 
          onLayout={(e) => setHabitsY(e.nativeEvent.layout.y)}
          className={`rounded-[40px] p-6 mb-20 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}
        >
            <Text className={`${isDark ? 'text-indigo-300' : 'text-blue-900'} font-bold text-xs uppercase tracking-widest mb-2`}>Weekly Quiz Intensity</Text>
            <View className="flex-row items-baseline mb-4">
                <Text className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>High Volume</Text>
                <Text className="text-gray-400 text-[10px] ml-2">
                  {currentMonthName.slice(0, 3)}: <AnimatedNumber trigger={triggerHabits} value={stats.current.count} format="number" textClass="font-bold" /> 
                  {' '}/ {previousMonthName.slice(0, 3)}: {stats.previous.count}
                </Text>
            </View>
            
            <View className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <Animated.View 
                  className={`h-full ${isDark ? 'bg-indigo-500' : 'bg-blue-800'}`} 
                  style={{ 
                    width: habitsAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '80%'] }) 
                  }} 
                />
            </View>

            <View className="h-8" />

            <Text className={`${isDark ? 'text-orange-300' : 'text-orange-900'} font-bold text-xs uppercase tracking-widest mb-2`}>Active Study Minutes</Text>
            <View className="flex-row items-baseline mb-4">
                <AnimatedNumber trigger={triggerHabits} value={stats.current.minutes} format="number" textClass={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`} />
                <Text className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}> min</Text>
                <Text className="text-gray-400 text-[10px] ml-2">vs {previousMonthName.slice(0, 3)}</Text>
            </View>
            
            <View className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <Animated.View 
                  className="h-full bg-orange-600" 
                  style={{ 
                    width: habitsAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '65%'] }) 
                  }} 
                />
            </View>
        </View>

      </ScrollView>
    </View>
  );
}

// Updated MetricBox to use AnimatedNumber internally
const MetricBox = ({ label, value, format, trend, isDark, trigger }) => (
  <View className={`w-[100%] py-4 border-b flex-row justify-between items-center ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
    <View>
        <Text className="text-gray-400 text-[10px] font-bold uppercase">{label}</Text>
        <AnimatedNumber 
          trigger={trigger} 
          value={value} 
          format={format} 
          textClass={`text-2xl font-black mt-1 ${isDark ? 'text-white' : 'text-gray-800'}`} 
        />
    </View>
    <View className="items-end">
        <Text className="text-orange-600 font-bold text-xs">{trend}</Text>
        <Text className="text-gray-300 text-[8px] uppercase">vs last month</Text>
    </View>
  </View>
);