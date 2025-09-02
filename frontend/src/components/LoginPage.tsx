import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Lock, Mail, FileText } from 'lucide-react';
import api from '@/services/api';

interface LoginPageProps {
  onLogin: (userData: { email: string; name: string }) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 呼叫後端 API
      const response = await api.login({
        email: email.trim(),
        password: password
      });

      if (response.success) {
        // 儲存 token 到 localStorage (修正路徑)
        localStorage.setItem('authToken', response.data.tokens.accessToken);
        localStorage.setItem('refreshToken', response.data.tokens.refreshToken);
        localStorage.setItem('userData', JSON.stringify(response.data.user));
        
        // 呼叫父組件的 onLogin
        onLogin({
          email: response.data.user.email,
          name: response.data.user.name
        });
      } else {
        // 處理錯誤
        alert(response.error?.message || '登入失敗');
      }
    } catch (error) {
      console.error('登入錯誤:', error);
      alert('網路連接錯誤，請檢查後端服務是否啟動');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo 和標題 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">系統分析工具</h1>
          <p className="text-gray-600 mt-2">專業的系統分析與文檔管理平台</p>
        </div>

        {/* 登入表單 */}
        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">登入帳戶</CardTitle>
            <p className="text-sm text-muted-foreground text-center">
              輸入帳號資訊或直接點擊登入按鈕以訪問系統
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">電子郵件</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com（可留空）"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密碼</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="輸入您的密碼（可留空）"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full mt-6"
                disabled={isLoading}
              >
                {isLoading ? '登入中...' : '登入'}
              </Button>
            </form>

            {/* 示範帳號提示 */}
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground text-center">
                💡 示範環境：可以空白登入，或輸入任何電子郵件即可進入系統
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 版權資訊 */}
        <p className="text-center text-sm text-gray-500 mt-8">
          © 2024 系統分析工具. 版權所有.
        </p>
      </div>
    </div>
  );
}