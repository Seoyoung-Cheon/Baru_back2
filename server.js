require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

// 환경 변수 확인 (디버깅용)
console.log("환경 변수 로드 확인:");
console.log(
    "AMADEUS_API_KEY:",
    process.env.AMADEUS_API_KEY ? "설정됨" : "설정 안됨"
);
console.log(
    "AMADEUS_API_SECRET:",
    process.env.AMADEUS_API_SECRET ? "설정됨" : "설정 안됨"
);
console.log("PORT:", PORT);

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 제공 (테스트 페이지용)
app.use(express.static(path.join(__dirname, "public")));

// API 라우트
app.use("/api", require("./routes/api"));
app.use("/api", require("./routes/hotels"));

// favicon.ico 요청 처리 (404 방지)
app.get("/favicon.ico", (req, res) => {
    res.status(204).end();
});

// 루트 경로 - 테스트 페이지로 리다이렉트
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "test.html"));
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`테스트 페이지: http://localhost:${PORT}`);
    console.log(`API 엔드포인트: http://localhost:${PORT}/api`);
});
