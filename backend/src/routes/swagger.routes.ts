/**
 * @swagger
 * /projects:
 *   get:
 *     tags: [Projects]
 *     summary: 取得專案列表
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 成功
 *   post:
 *     tags: [Projects]
 *     summary: 建立新專案
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: 建立成功
 * 
 * /projects/{projectId}:
 *   get:
 *     tags: [Projects]
 *     summary: 取得專案詳情
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 *   put:
 *     tags: [Projects]
 *     summary: 更新專案
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 更新成功
 *   delete:
 *     tags: [Projects]
 *     summary: 刪除專案
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: 刪除成功
 * 
 * /projects/{projectId}/modules:
 *   get:
 *     tags: [Modules]
 *     summary: 取得模組列表
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 *   post:
 *     tags: [Modules]
 *     summary: 建立新模組
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: 建立成功
 * 
 * /modules/{moduleId}:
 *   get:
 *     tags: [Modules]
 *     summary: 取得模組詳情
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 *   put:
 *     tags: [Modules]
 *     summary: 更新模組
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 更新成功
 *   delete:
 *     tags: [Modules]
 *     summary: 刪除模組
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: 刪除成功
 * 
 * /modules/{moduleId}/use-cases:
 *   get:
 *     tags: [UseCases]
 *     summary: 取得用例列表
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 *   post:
 *     tags: [UseCases]
 *     summary: 建立新用例
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: 建立成功
 * 
 * /use-cases/{useCaseId}:
 *   get:
 *     tags: [UseCases]
 *     summary: 取得用例詳情
 *     parameters:
 *       - in: path
 *         name: useCaseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 * 
 * /use-cases/{useCaseId}/sequences:
 *   get:
 *     tags: [Sequences]
 *     summary: 取得序列圖列表
 *     parameters:
 *       - in: path
 *         name: useCaseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 *   post:
 *     tags: [Sequences]
 *     summary: 建立新序列圖
 *     parameters:
 *       - in: path
 *         name: useCaseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: 建立成功
 * 
 * /sequences/{sequenceId}:
 *   get:
 *     tags: [Sequences]
 *     summary: 取得序列圖詳情
 *     parameters:
 *       - in: path
 *         name: sequenceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 * 
 * /projects/{projectId}/apis:
 *   get:
 *     tags: [APIs]
 *     summary: 取得 API 列表
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 *   post:
 *     tags: [APIs]
 *     summary: 建立新 API
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: 建立成功
 * 
 * /apis/{apiId}:
 *   get:
 *     tags: [APIs]
 *     summary: 取得 API 詳情
 *     parameters:
 *       - in: path
 *         name: apiId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 * 
 * /projects/{projectId}/dtos:
 *   get:
 *     tags: [DTOs]
 *     summary: 取得 DTO 列表
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 *   post:
 *     tags: [DTOs]
 *     summary: 建立新 DTO
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: 建立成功
 * 
 * /dtos/{dtoId}:
 *   get:
 *     tags: [DTOs]
 *     summary: 取得 DTO 詳情
 *     parameters:
 *       - in: path
 *         name: dtoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 * 
 * /statistics/{projectId}:
 *   get:
 *     tags: [Statistics]
 *     summary: 取得專案統計資訊
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: simple
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: 成功
 * 
 * /catalog:
 *   get:
 *     tags: [Catalog]
 *     summary: 取得完整目錄
 *     responses:
 *       200:
 *         description: 成功
 * 
 * /catalog/modules:
 *   get:
 *     tags: [Catalog]
 *     summary: 取得模組目錄
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 * 
 * /catalog/apis:
 *   get:
 *     tags: [Catalog]
 *     summary: 取得 API 目錄
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 * 
 * /catalog/dtos:
 *   get:
 *     tags: [Catalog]
 *     summary: 取得 DTO 目錄
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 * 
 * /search:
 *   get:
 *     tags: [Search]
 *     summary: 全文搜尋
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, project, module, useCase, sequence, api, dto]
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 * 
 * /consistency/check:
 *   post:
 *     tags: [Consistency]
 *     summary: 執行一致性檢查
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *             properties:
 *               projectId:
 *                 type: string
 *     responses:
 *       200:
 *         description: 檢查完成
 * 
 * /consistency/report/{projectId}:
 *   get:
 *     tags: [Consistency]
 *     summary: 取得一致性檢查報告
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 * 
 * /ai/generate:
 *   post:
 *     tags: [AI]
 *     summary: 生成 AI 內容
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [sequence, api, dto]
 *               projectId:
 *                 type: string
 *     responses:
 *       200:
 *         description: 生成成功
 * 
 * /ai/drafts/{draftId}:
 *   get:
 *     tags: [AI]
 *     summary: 取得 AI 草稿
 *     parameters:
 *       - in: path
 *         name: draftId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 * 
 * /ai/adopt-draft:
 *   post:
 *     tags: [AI]
 *     summary: 採用 AI 草稿
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - draftId
 *             properties:
 *               draftId:
 *                 type: string
 *     responses:
 *       201:
 *         description: 採用成功
 * 
 * /export/project/{projectId}:
 *   post:
 *     tags: [Export/Import]
 *     summary: 匯出專案資料
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 匯出成功
 * 
 * /import/project:
 *   post:
 *     tags: [Export/Import]
 *     summary: 匯入專案資料
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: 匯入成功
 */

// This file is only for Swagger documentation
export {};