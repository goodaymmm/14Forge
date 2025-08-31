import { Application } from 'express';
import summonerRoutes from './summoner';
import matchRoutes from './match';
import analysisRoutes from './analysis';
import metaRoutes from './meta';
import n8nRoutes from './n8n';
import n8nEnhancedRoutes from './n8n-enhanced';
import metaScrapingRoutes from './metaScraping';
import heatmapRoutes from './heatmap';
import heatmapExportRoutes from './heatmapExport';
import knowledgeRoutes from './knowledge';

export const setupRoutes = (app: Application) => {
  // API routes
  app.use('/api/summoner', summonerRoutes);
  app.use('/api/matches', matchRoutes);
  app.use('/api/analysis', analysisRoutes);
  app.use('/api/meta', metaRoutes);
  app.use('/api/n8n', n8nRoutes);
  app.use('/api/n8n', n8nEnhancedRoutes);  // Enhanced n8n routes
  app.use('/api/scraping', metaScrapingRoutes);
  app.use('/api/heatmap', heatmapRoutes);  // Heatmap routes
  app.use('/api/heatmap', heatmapExportRoutes);  // Heatmap export routes
  app.use('/api/knowledge', knowledgeRoutes);  // Knowledge base routes

  // 404 handler for API routes
  app.use('/api/*', (_req, res) => {
    // TODO: Future - log 404 requests for monitoring unknown endpoints
    res.status(404).json({
      success: false,
      error: {
        message: 'API endpoint not found',
        statusCode: 404
      }
    });
  });
};