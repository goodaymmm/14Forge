import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import LoadingSpinner from '../common/LoadingSpinner';
import { Info, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

interface CoachingData {
  analysis: {
    cs_efficiency: number;
    gold_efficiency: number;
    itemization_score: number;
    macro_play_rating: number;
  };
  recommendations: string[];
  priority_actions: string[];
  benchmark_comparison: {
    vs_average: number;
    vs_high_rank: number;
  };
}

interface FourteenCoacherProps {
  summonerName?: string;
  region: string;
  matchId: string;
  participants?: any[];
  champion?: string;
  role?: string;
  locale?: string;
  tier?: string;  // Player's current tier (IRON, BRONZE, SILVER, etc.)
  division?: string;  // Division within tier (I, II, III, IV)
  onClose?: () => void;
}

// Helper function to extract numeric values from various formats
const extractNumericValue = (field: any): number => {
  if (typeof field === 'number') return field;
  if (typeof field === 'object' && field?.value) return field.value;
  // Default percentage value for display
  return 75;
};

const FourteenCoacher: React.FC<FourteenCoacherProps> = ({
  summonerName,
  region,
  matchId,
  participants,
  champion,
  role,
  locale,
  tier,
  division,
  onClose
}) => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [coachingData, setCoachingData] = useState<CoachingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [expandedFeedback, setExpandedFeedback] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Get current language from i18n (default to English)
  const currentLocale = locale || i18n.language || 'en';
  
  // Get the current player from participants if not provided
  const currentPlayer = participants?.find(p => 
    p.summonerName?.toLowerCase() === summonerName?.toLowerCase() ||
    p.riotIdGameName?.toLowerCase() === summonerName?.toLowerCase()
  );

  const playerChampion = champion || currentPlayer?.championName || 'Unknown';
  const playerRole = role || currentPlayer?.teamPosition || currentPlayer?.individualPosition || 'UNKNOWN';
  const playerSummonerName = summonerName || currentPlayer?.summonerName || currentPlayer?.riotIdGameName || 'Unknown';
  
  // Extract tier and division from participant's ranked info or use provided values
  const playerTier = tier || currentPlayer?.rankedInfo?.tier || 'UNRANKED';
  const playerDivision = division || currentPlayer?.rankedInfo?.rank || 'IV';

  // Manual trigger for coaching
  const handleAnalyzeClick = () => {
    setShowModal(true);
    if (!coachingData && playerSummonerName !== 'Unknown') {
      fetchCoaching();
    }
  };

  const fetchCoaching = async () => {
    setLoading(true);
    setError(null);
    abortControllerRef.current = new AbortController();

    try {
      console.log('Fetching coaching data...', {
        summonerName: playerSummonerName,
        region,
        matchId,
        champion: playerChampion,
        role: playerRole,
        tier: playerTier,
        division: playerDivision,
        locale: currentLocale
      });
      
      // First call our Express API to prepare data and trigger n8n
      const response = await fetch('/api/n8n/webhook/14coacher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summonerName: playerSummonerName,
          region,
          matchId,
          champion: playerChampion,
          role: playerRole,
          tier: playerTier,
          division: playerDivision,
          locale: currentLocale,
          language: i18n.language || 'ja'
        }),
        signal: abortControllerRef.current?.signal
      });

      if (!response.ok) {
        throw new Error('Failed to initiate AI coaching analysis');
      }

      const result = await response.json();
      console.log('Backend API response:', {
        status: result.status,
        hasCache: !!result.coaching_analysis,
        cacheKey: result.cache_key,
        responseKeys: Object.keys(result)
      });
      
      // Check response status
      if (result.status === 'processing') {
        // n8n is processing, start polling
        const cacheKey = result.cache_key || `14coacher_${playerSummonerName}_${matchId}_${currentLocale}`;
        
        console.log('Backend returned processing status, will start polling after delay', {
          cacheKey,
          message: result.message
        });
        
        // Wait for n8n to process and store the analysis
        // Optimized polling settings for n8n processing time (2.5-3.5 minutes)
        let attempts = 0;
        const maxAttempts = 40;  // 5 seconds × 40 = 200 seconds (3min 20sec) after initial delay
        const pollInterval = 5000;  // Poll every 5 seconds
        const initialDelay = 240000;  // Wait 4 minutes before first poll (n8n takes 2.5-3.5min)
        
        console.log('Starting to poll for AI analysis results', {
          cacheKey,
          endpoint: `/api/n8n/analysis/${cacheKey}`,
          initialDelay: `${initialDelay / 1000} seconds`,
          maxWaitTime: `${(maxAttempts * pollInterval) / 1000} seconds`
        });
        
        const pollForResults = async () => {
          if (abortControllerRef.current?.signal.aborted) {
            console.log('[FourteenCoacher] Polling aborted by user');
            setLoading(false);
            return;
          }
          
          attempts++;
          
          try {
            console.log(`Polling attempt ${attempts}/${maxAttempts} for cache_key: ${cacheKey}`);
            const analysisResponse = await fetch(`/api/n8n/analysis/${cacheKey}`, {
              signal: abortControllerRef.current?.signal
            });
            
            if (analysisResponse.ok) {
              const analysisData = await analysisResponse.json();
              console.log('Analysis response received:', {
                hasResult: !!analysisData.analysis_result,
                isExpired: analysisData.is_expired,
                cacheKey
              });
              
              if (analysisData.analysis_result) {
                console.log('AI analysis completed successfully!', analysisData.analysis_result);
                
                let finalData = analysisData.analysis_result?.ai_analysis || analysisData.analysis_result;
                
                // Handle array response (take first element)
                if (Array.isArray(finalData) && finalData.length > 0) {
                  console.log('Received array response, extracting first element');
                  finalData = finalData[0];
                }
                
                // If finalData is a string, parse it first
                if (typeof finalData === 'string') {
                  try {
                    finalData = JSON.parse(finalData);
                  } catch (e) {
                    console.warn('First parse failed:', e);
                  }
                }
                
                // Check if analysis field contains a JSON string (n8n output format)
                if (typeof finalData?.analysis === 'string') {
                  try {
                    // Remove ```json``` tags and extra escaping
                    let cleanJson = finalData.analysis
                      .replace(/```json\s*/g, '')
                      .replace(/```\s*/g, '')
                      .trim();
                    
                    const parsed = JSON.parse(cleanJson);
                    
                    // Merge parsed result into finalData
                    finalData = {
                      ...finalData,
                      ...parsed,
                      performance_score: parsed.performance_score || finalData.performance_score || 85
                    };
                  } catch (e) {
                    console.error('Failed to parse nested JSON:', e);
                  }
                }
                
                // Helper function to normalize priority_actions
                const normalizePriorityActions = (actions: any[]): string[] => {
                  if (!Array.isArray(actions)) return [];
                  
                  return actions.map((action: any) => {
                    // If action is an object with time, action, details structure
                    if (typeof action === 'object' && action !== null) {
                      const { time, action: actionText, details } = action;
                      // Format: 【time】 action - details
                      if (time && actionText) {
                        return `【${time}】 ${actionText}${details ? ` - ${details}` : ''}`;
                      }
                      // Fallback for other object structures
                      return JSON.stringify(action);
                    }
                    // Already a string or can be converted to string
                    return String(action);
                  });
                };
                
                // Normalize data structure with enhanced field checking
                const processedData = {
                  analysis: finalData?.analysis || {
                    cs_efficiency: 75,
                    gold_efficiency: 70,
                    itemization_score: 65,
                    macro_play_rating: 75
                  },
                  recommendations: Array.isArray(finalData?.recommendations) && finalData.recommendations.length > 0 
                    ? finalData.recommendations 
                    : [],
                  priority_actions: normalizePriorityActions(
                    Array.isArray(finalData?.next_steps) 
                      ? finalData.next_steps 
                      : (Array.isArray(finalData?.priority_actions) ? finalData.priority_actions : [])
                  ),
                  benchmark_comparison: {
                    vs_average: typeof finalData?.benchmark_comparison?.vs_average === 'object' 
                      ? (finalData.benchmark_comparison.vs_average.cs_difference ?? 
                         finalData.benchmark_comparison.vs_average.gold_difference ?? 5)
                      : (finalData?.benchmark_comparison?.vs_average ?? 
                         finalData?.benchmark_comparison?.cs_difference ?? 5),
                    vs_high_rank: typeof finalData?.benchmark_comparison?.vs_high_rank === 'object'
                      ? (finalData.benchmark_comparison.vs_high_rank.cs_difference ?? 
                         finalData.benchmark_comparison.vs_high_rank.gold_difference ?? -10)
                      : (finalData?.benchmark_comparison?.vs_high_rank ?? 
                         finalData?.benchmark_comparison?.gold_difference ?? -10)
                  }
                };
                
                setCoachingData(processedData);
                setLoading(false);
                return;
              }
            } else if (analysisResponse.status === 404) {
              console.log(`Analysis not found yet for cache_key: ${cacheKey}`);
            } else {
              console.warn('Unexpected response status:', analysisResponse.status);
            }
            
            if (attempts < maxAttempts) {
              console.log(`Waiting ${pollInterval}ms before next attempt...`);
              setTimeout(pollForResults, pollInterval);
            } else {
              const errorMsg = `Analysis timeout after ${attempts} attempts. Please check n8n workflow logs.`;
              console.error(errorMsg, {
                cacheKey,
                hint: 'Check if n8n workflow completed successfully and cache_key matches'
              });
              throw new Error(errorMsg);
            }
          } catch (pollError) {
            console.error('Polling error:', pollError);
            setError('Failed to retrieve analysis results. Please check console for details.');
            setLoading(false);
          }
        };
        
        // Start polling after initial delay
        setTimeout(pollForResults, initialDelay);
        
      } else if (result.coaching_analysis) {
        // Cached result available - normalize the data
        console.log('Using cached coaching data', result.coaching_analysis);
        
        let cachedData = result.coaching_analysis;
        
        // Handle array response (take first element)
        if (Array.isArray(cachedData) && cachedData.length > 0) {
          console.log('Cached data is array, extracting first element');
          cachedData = cachedData[0];
        }
        
        // Helper function to normalize priority_actions (same as above)
        const normalizePriorityActions = (actions: any[]): string[] => {
          if (!Array.isArray(actions)) return [];
          
          return actions.map((action: any) => {
            // If action is an object with time, action, details structure
            if (typeof action === 'object' && action !== null) {
              const { time, action: actionText, details } = action;
              // Format: 【time】 action - details
              if (time && actionText) {
                return `【${time}】 ${actionText}${details ? ` - ${details}` : ''}`;
              }
              // Fallback for other object structures
              return JSON.stringify(action);
            }
            // Already a string or can be converted to string
            return String(action);
          });
        };
        
        // benchmark_comparisonとpriority_actionsを正規化
        const normalizedData = {
          ...cachedData,
          priority_actions: normalizePriorityActions(
            cachedData?.priority_actions || []
          ),
          benchmark_comparison: {
            vs_average: typeof cachedData?.benchmark_comparison?.vs_average === 'object' 
              ? (cachedData.benchmark_comparison.vs_average.cs_difference ?? 
                 cachedData.benchmark_comparison.vs_average.gold_difference ?? 5)
              : (cachedData?.benchmark_comparison?.vs_average ?? 
                 cachedData?.benchmark_comparison?.cs_difference ?? 5),
            vs_high_rank: typeof cachedData?.benchmark_comparison?.vs_high_rank === 'object'
              ? (cachedData.benchmark_comparison.vs_high_rank.cs_difference ?? 
                 cachedData.benchmark_comparison.vs_high_rank.gold_difference ?? -10)
              : (cachedData?.benchmark_comparison?.vs_high_rank ?? 
                 cachedData?.benchmark_comparison?.gold_difference ?? -10)
          }
        };
        
        setCoachingData(normalizedData);
        setLoading(false);
        
      } else if (result.status === 'error') {
        // Error response from backend
        console.error('Backend returned error:', result);
        throw new Error(result.message || 'Failed to get coaching analysis');
        
      } else {
        // Unexpected response
        console.error('Unexpected response from backend:', result);
        throw new Error('Unexpected response format from backend');
      }

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('[FourteenCoacher] Analysis cancelled by user');
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      }
      setLoading(false);
    }
  };
  

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Show only button initially
  if (!showModal) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                {t('contest.fourteenCoacher.title')}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {playerSummonerName !== 'Unknown' ? playerSummonerName : t('contest.fourteenCoacher.description')}
              </p>
            </div>
            <Button 
              onClick={handleAnalyzeClick}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={playerSummonerName === 'Unknown'}
            >
              <Brain className="w-4 h-4 mr-2" />
              {t('contest.fourteenCoacher.analyze')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            ❌
          </div>
          <div>
            <h3 className="font-semibold text-red-900">{t('contest.fourteenCoacher.unavailable')}</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Card className="w-full mt-4 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                🎯
              </div>
              <div>
                <h2 className="text-xl font-bold text-purple-900">
                  {t('contest.fourteenCoacher.modalTitle')}
                </h2>
                <p className="text-purple-700 text-sm">
                  {champion} - {role === 'UTILITY' ? 'SUP' : role} | {matchId}
                </p>
              </div>
            </div>
          </div>
          
          {!coachingData && !loading && (
            <Button 
              onClick={fetchCoaching}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 w-full"
            >
              <Brain className="w-4 h-4 mr-2" />
              {t('contest.fourteenCoacher.getCoaching')}
            </Button>
          )}

          {loading && (
            <div className="min-h-[400px] w-full flex items-center justify-center">
              <div className="flex flex-col items-center space-y-4 max-w-md w-full">
                <LoadingSpinner />
                <div className="text-center w-full">
                  <p className="text-purple-800 font-medium text-lg">
                    {t('contest.fourteenCoacher.aiAnalyzing')}
                  </p>
                  <div className="bg-white/50 rounded-lg p-3 mt-3">
                    <p className="text-purple-700 text-sm font-medium mb-2">{t('contest.fourteenCoacher.processingContent')}</p>
                    <div className="text-purple-600 text-sm space-y-1">
                      <p>• {t('contest.fourteenCoacher.comparingHighRank')}</p>
                      <p>• {t('contest.fourteenCoacher.evaluatingMacro')}</p>
                      <p>• {t('contest.fourteenCoacher.creatingImprovements')}</p>
                    </div>
                  </div>
                  {/* プログレスバー */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                    <div className="bg-gradient-to-r from-purple-700 to-purple-800 h-2 rounded-full animate-pulse" 
                         style={{width: '60%'}}>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {coachingData && (
            <div className="space-y-6">
          {/* Performance Scores */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(coachingData.analysis?.cs_efficiency || 0)}`}>
                  {coachingData.analysis?.cs_efficiency || 0}%
                </div>
                <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                  {t('contest.fourteenCoacher.csEfficiency')}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="inline-flex">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>{t('contest.fourteenCoacher.csEfficiencyTooltip')}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(coachingData.analysis?.gold_efficiency || 0)}`}>
                  {coachingData.analysis?.gold_efficiency || 0}%
                </div>
                <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                  {t('contest.fourteenCoacher.goldEfficiency')}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="inline-flex">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>{t('contest.fourteenCoacher.goldEfficiencyTooltip')}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(coachingData.analysis?.itemization_score || 0)}`}>
                  {coachingData.analysis?.itemization_score || 0}%
                </div>
                <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                  {t('contest.fourteenCoacher.itemization')}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="inline-flex">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>{t('contest.fourteenCoacher.itemizationTooltip')}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(coachingData.analysis?.macro_play_rating || 0)}`}>
                  {coachingData.analysis?.macro_play_rating || 0}%
                </div>
                <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                  {t('contest.fourteenCoacher.macroPlay')}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="inline-flex">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>{t('contest.fourteenCoacher.macroPlayTooltip')}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>

          {/* Benchmark Comparison */}
          <div className="bg-white rounded-lg p-4 border">
            <h3 className="font-semibold mb-3 text-gray-900">📊 Benchmark Comparison</h3>
            <div className="flex justify-between">
              <div className="text-center">
                <div className={`text-lg font-bold ${coachingData.benchmark_comparison.vs_average >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {coachingData.benchmark_comparison.vs_average >= 0 ? '+' : ''}{coachingData.benchmark_comparison.vs_average}%
                </div>
                <div className="text-sm text-gray-600">{t('contest.fourteenCoacher.vsAverage')}</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${coachingData.benchmark_comparison.vs_high_rank >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {coachingData.benchmark_comparison.vs_high_rank >= 0 ? '+' : ''}{coachingData.benchmark_comparison.vs_high_rank}%
                </div>
                <div className="text-sm text-gray-600">{t('contest.fourteenCoacher.vsHighRank')}</div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-lg p-4 border">
            <h3 className="font-semibold mb-3 text-gray-900">💡 {t('contest.fourteenCoacher.recommendations')}</h3>
            <div className="space-y-3">
              {coachingData.recommendations && coachingData.recommendations.length > 0 ? (
                coachingData.recommendations.map((rec, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-sm font-medium flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="text-sm text-gray-800">{rec}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-center py-4">{t('contest.fourteenCoacher.loadingAnalysis')}</div>
              )}
            </div>
          </div>

          {/* Priority Actions (Feedback) - Accordion */}
          <div className="bg-white rounded-lg p-4 border">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedFeedback(!expandedFeedback)}
            >
              <h3 className="font-semibold text-gray-900">🎯 {t('contest.fourteenCoacher.priorityActions')}</h3>
              <Button variant="ghost" size="sm" className="p-1">
                {expandedFeedback ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
            
            <div className="space-y-2 mt-3">
              {coachingData.priority_actions && coachingData.priority_actions.length > 0 ? (
                <>
                  {/* Always show first 3 items */}
                  {coachingData.priority_actions.slice(0, 3).map((action, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-sm font-medium flex-shrink-0 mt-1">
                        {index + 1}
                      </div>
                      <span className="text-gray-800 text-sm">{action}</span>
                    </div>
                  ))}
                  
                  {/* Show remaining items when expanded */}
                  {expandedFeedback && coachingData.priority_actions.length > 3 && (
                    <>
                      {coachingData.priority_actions.slice(3).map((action, index) => (
                        <div key={index + 3} className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-sm font-medium flex-shrink-0 mt-1">
                            {index + 4}
                          </div>
                          <span className="text-gray-800 text-sm">{action}</span>
                        </div>
                      ))}
                    </>
                  )}
                  
                  {/* Show expand button if there are more than 3 items */}
                  {coachingData.priority_actions.length > 3 && !expandedFeedback && (
                    <div className="text-center pt-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedFeedback(true);
                        }}
                        className="text-purple-600 hover:text-purple-700"
                      >
                        {t('common.showMore')} ({coachingData.priority_actions.length - 3})
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-gray-500 text-center py-4">{t('contest.fourteenCoacher.analyzing')}</div>
              )}
            </div>
          </div>

          {/* Powered by Badge */}
          <div className="flex justify-center pt-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full text-sm">
              <span>🤖</span>
              <span>{t('contest.fourteenCoacher.poweredBy')}</span>
            </div>
          </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default FourteenCoacher;