/**
 * Mermaid 序列圖解析服務
 * 解析 Mermaid 語法，提取 API 呼叫資訊
 */

export interface ParsedApiCall {
  from: string;
  to: string;
  method?: string;
  endpoint?: string;
  description?: string;
  sequence: number;
}

export interface ParseResult {
  success: boolean;
  participants: string[];
  apiCalls: ParsedApiCall[];
  error?: string;
}

export class MermaidParserService {
  /**
   * 解析 Mermaid 序列圖
   */
  static parse(mermaidSource: string): ParseResult {
    try {
      // 處理空內容
      if (!mermaidSource || mermaidSource.trim().length === 0) {
        return {
          success: true,
          participants: [],
          apiCalls: [],
        };
      }

      const lines = mermaidSource.split('\n').map(line => line.trim());
      const participants = new Set<string>();
      const apiCalls: ParsedApiCall[] = [];
      let sequence = 0;

      for (const line of lines) {
        // 忽略空行和註解
        if (!line || line.startsWith('%%')) {
          continue;
        }

        // 解析 participant 宣告
        if (line.startsWith('participant ')) {
          const participant = this.extractParticipant(line);
          if (participant) {
            participants.add(participant);
          }
        }

        // 解析 actor 宣告
        if (line.startsWith('actor ')) {
          const actor = this.extractActor(line);
          if (actor) {
            participants.add(actor);
          }
        }

        // 解析訊息傳遞（API 呼叫）
        const apiCall = this.extractApiCall(line, sequence);
        if (apiCall) {
          apiCalls.push(apiCall);
          sequence++;
          
          // 自動加入參與者
          participants.add(apiCall.from);
          participants.add(apiCall.to);
        }
      }

      return {
        success: true,
        participants: Array.from(participants),
        apiCalls,
      };
    } catch (error) {
      return {
        success: false,
        participants: [],
        apiCalls: [],
        error: error instanceof Error ? error.message : 'Unknown parsing error',
      };
    }
  }

  /**
   * 提取 participant 宣告
   */
  private static extractParticipant(line: string): string | null {
    // participant User as U
    // participant "User Service" as US
    const match = line.match(/participant\s+(?:"([^"]+)"|(\S+))(?:\s+as\s+(\S+))?/);
    if (match) {
      return match[3] || match[1] || match[2];
    }
    return null;
  }

  /**
   * 提取 actor 宣告
   */
  private static extractActor(line: string): string | null {
    // actor User as U
    // actor "End User" as EU
    const match = line.match(/actor\s+(?:"([^"]+)"|(\S+))(?:\s+as\s+(\S+))?/);
    if (match) {
      return match[3] || match[1] || match[2];
    }
    return null;
  }

  /**
   * 提取 API 呼叫資訊
   */
  private static extractApiCall(line: string, sequence: number): ParsedApiCall | null {
    // 支援的格式：
    // A->>B: GET /api/users
    // A->B: POST /api/login
    // A-->>B: Response 200 OK
    // A-->B: Error 401
    
    const patterns = [
      // 帶箭頭的訊息
      /^(\S+)\s*(->>?|-->>?|-\)|-x)\s*(\S+)\s*:\s*(.+)$/,
      // 啟動/停用
      /^(activate|deactivate)\s+(\S+)$/,
      // 註解
      /^Note\s+(right of|left of|over)\s+(\S+)\s*:\s*(.+)$/,
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        if (match[0].startsWith('activate') || match[0].startsWith('deactivate')) {
          // 忽略啟動/停用指令
          return null;
        }
        
        if (match[0].startsWith('Note')) {
          // 忽略註解
          return null;
        }

        const from = match[1];
        const to = match[3];
        const message = match[4];

        // 嘗試解析 HTTP 方法和端點
        const apiMatch = message.match(/^(GET|POST|PUT|DELETE|PATCH)\s+([^\s]+)(?:\s+(.+))?$/);
        
        if (apiMatch) {
          return {
            from,
            to,
            method: apiMatch[1],
            endpoint: apiMatch[2],
            description: apiMatch[3] || message,
            sequence,
          };
        }

        // 如果不是標準 API 格式，仍然記錄為一般訊息
        return {
          from,
          to,
          description: message,
          sequence,
        };
      }
    }

    return null;
  }

  /**
   * 驗證 Mermaid 語法基本結構
   */
  static validate(mermaidSource: string): { valid: boolean; error?: string } {
    // 空內容被視為有效，狀態為pending
    if (!mermaidSource || mermaidSource.trim().length === 0) {
      return { valid: true };
    }

    const lines = mermaidSource.split('\n').map(line => line.trim());
    const firstLine = lines.find(line => line && !line.startsWith('%%'));

    if (!firstLine || !firstLine.startsWith('sequenceDiagram')) {
      return { valid: false, error: 'Must start with "sequenceDiagram"' };
    }

    // 檢查是否有未閉合的區塊
    let loopDepth = 0;
    let altDepth = 0;
    let optDepth = 0;
    let parDepth = 0;

    for (const line of lines) {
      if (line.startsWith('loop')) loopDepth++;
      if (line === 'end' && loopDepth > 0) loopDepth--;
      
      if (line.startsWith('alt')) altDepth++;
      if (line === 'end' && altDepth > 0) altDepth--;
      
      if (line.startsWith('opt')) optDepth++;
      if (line === 'end' && optDepth > 0) optDepth--;
      
      if (line.startsWith('par')) parDepth++;
      if (line === 'end' && parDepth > 0) parDepth--;
    }

    if (loopDepth !== 0) {
      return { valid: false, error: 'Unclosed loop block' };
    }
    if (altDepth !== 0) {
      return { valid: false, error: 'Unclosed alt block' };
    }
    if (optDepth !== 0) {
      return { valid: false, error: 'Unclosed opt block' };
    }
    if (parDepth !== 0) {
      return { valid: false, error: 'Unclosed par block' };
    }

    return { valid: true };
  }

  /**
   * 格式化 Mermaid 原始碼
   */
  static format(mermaidSource: string): string {
    const lines = mermaidSource.split('\n');
    const formatted: string[] = [];
    let indentLevel = 0;
    const indentSize = 2;

    for (let line of lines) {
      line = line.trim();
      
      if (!line) {
        formatted.push('');
        continue;
      }

      // 減少縮排的關鍵字
      if (line === 'end' || line.startsWith('else')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      // 加入縮排
      const indentedLine = ' '.repeat(indentLevel * indentSize) + line;
      formatted.push(indentedLine);

      // 增加縮排的關鍵字
      if (line.startsWith('loop') || 
          line.startsWith('alt') || 
          line.startsWith('opt') || 
          line.startsWith('par') ||
          line.startsWith('else')) {
        indentLevel++;
      }
    }

    return formatted.join('\n');
  }

  /**
   * 從解析結果生成 Mermaid 原始碼
   */
  static generate(participants: string[], apiCalls: ParsedApiCall[]): string {
    const lines: string[] = ['sequenceDiagram'];

    // 加入參與者
    participants.forEach(participant => {
      lines.push(`  participant ${participant}`);
    });

    lines.push('');

    // 加入 API 呼叫
    apiCalls.forEach(call => {
      const arrow = call.method ? '->>' : '->';
      const message = call.method 
        ? `${call.method} ${call.endpoint}${call.description ? ' - ' + call.description : ''}`
        : call.description || '';
      
      lines.push(`  ${call.from}${arrow}${call.to}: ${message}`);
    });

    return lines.join('\n');
  }
}

export default MermaidParserService;