/**
 * Search 路由定義
 */

import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';

const router = Router();
const searchController = new SearchController();

// 搜尋
router.get('/', searchController.search);

// 搜尋建議
router.get('/suggest', searchController.suggest);

export default router;