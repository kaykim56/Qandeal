"use client";

import { useState } from "react";
import { useQandaUser } from "@/components/QandaUserProvider";

// 테스트용 JWT 생성 (실제 서명 없이 디코딩만 가능한 토큰)
function createTestJwt(userId: string): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  );
  const signature = "test-signature";
  return `${header}.${payload}.${signature}`;
}

export default function QandaTestPage() {
  const { user, isQandaUser } = useQandaUser();
  const [testUserId, setTestUserId] = useState("test-user-123");
  const [cookies, setCookies] = useState("");

  const refreshCookies = () => {
    setCookies(document.cookie);
  };

  const setTestCookies = () => {
    const token = createTestJwt(testUserId);
    document.cookie = `access_token=${token}; path=/`;
    document.cookie = `qanda_token=${token}; path=/`;
    document.cookie = `qanda_user_id=${testUserId}; path=/`;
    refreshCookies();
    alert("쿠키가 설정되었습니다. 페이지를 새로고침하면 useQandaUser에 반영됩니다.");
  };

  const clearCookies = () => {
    document.cookie = "access_token=; path=/; max-age=0";
    document.cookie = "qanda_token=; path=/; max-age=0";
    document.cookie = "qanda_user_id=; path=/; max-age=0";
    sessionStorage.removeItem("qanda_user_id");
    refreshCookies();
    alert("쿠키가 삭제되었습니다. 페이지를 새로고침하면 반영됩니다.");
  };

  const testToken = createTestJwt(testUserId);

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">Qanda User 테스트</h1>

      {/* useQandaUser 결과 */}
      <section className="p-4 bg-gray-100 rounded-lg">
        <h2 className="font-semibold mb-2">useQandaUser() 결과</h2>
        <div className="text-sm space-y-1">
          <p>
            <span className="font-medium">isQandaUser:</span>{" "}
            <span className={isQandaUser ? "text-green-600" : "text-red-600"}>
              {isQandaUser ? "true" : "false"}
            </span>
          </p>
          <p>
            <span className="font-medium">user.userId:</span>{" "}
            {user?.userId || "(없음)"}
          </p>
        </div>
      </section>

      {/* 쿠키 수동 설정 */}
      <section className="p-4 bg-blue-50 rounded-lg space-y-3">
        <h2 className="font-semibold">쿠키 수동 설정</h2>
        <div>
          <label className="text-sm text-gray-600">테스트 User ID</label>
          <input
            type="text"
            value={testUserId}
            onChange={(e) => setTestUserId(e.target.value)}
            className="w-full mt-1 p-2 border rounded"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={setTestCookies}
            className="px-4 py-2 bg-blue-500 text-white rounded text-sm"
          >
            쿠키 설정
          </button>
          <button
            onClick={clearCookies}
            className="px-4 py-2 bg-red-500 text-white rounded text-sm"
          >
            쿠키 삭제
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-500 text-white rounded text-sm"
          >
            새로고침
          </button>
        </div>
      </section>

      {/* 현재 쿠키 */}
      <section className="p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold">현재 쿠키</h2>
          <button
            onClick={refreshCookies}
            className="text-sm text-blue-500 underline"
          >
            새로고침
          </button>
        </div>
        <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
          {cookies || "(쿠키 확인하려면 새로고침 클릭)"}
        </pre>
      </section>

      {/* curl 테스트 방법 */}
      <section className="p-4 bg-yellow-50 rounded-lg">
        <h2 className="font-semibold mb-2">curl 테스트 (미들웨어 확인)</h2>
        <p className="text-sm text-gray-600 mb-2">
          터미널에서 아래 명령어로 미들웨어가 쿠키를 설정하는지 확인:
        </p>
        <pre className="text-xs bg-white p-2 rounded border overflow-x-auto whitespace-pre-wrap">
{`curl -v -H "Authorization: Bearer ${testToken}" http://localhost:3000/landing 2>&1 | grep -i set-cookie`}
        </pre>
      </section>
    </div>
  );
}
