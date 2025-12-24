require("dotenv").config({
    path: require("path").join(__dirname, "..", ".env"),
});
const express = require("express");
const axios = require("axios");
const router = express.Router();

// 임시 데이터 저장소 (실제로는 데이터베이스를 사용하세요)
let users = [
    { id: 1, name: "홍길동", email: "hong@example.com" },
    { id: 2, name: "김철수", email: "kim@example.com" },
];

let trips = [
    { id: 1, destination: "제주도", budget: 500000, peopleCount: 2 },
    { id: 2, destination: "부산", budget: 300000, peopleCount: 3 },
];

// ============ 사용자 관련 API ============

// GET /api/users - 모든 사용자 조회
router.get("/users", (req, res) => {
    try {
        res.json({
            success: true,
            data: users,
            message: "사용자 목록을 성공적으로 조회했습니다.",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: "사용자 목록 조회 중 오류가 발생했습니다.",
        });
    }
});

// GET /api/users/:id - 특정 사용자 조회
router.get("/users/:id", (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const user = users.find((u) => u.id === id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "사용자를 찾을 수 없습니다.",
                message: `ID ${id}에 해당하는 사용자가 없습니다.`,
            });
        }

        res.json({
            success: true,
            data: user,
            message: "사용자를 성공적으로 조회했습니다.",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: "사용자 조회 중 오류가 발생했습니다.",
        });
    }
});

// POST /api/users - 사용자 생성
router.post("/users", (req, res) => {
    try {
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                error: "필수 필드가 누락되었습니다.",
                message: "name과 email은 필수입니다.",
            });
        }

        const newUser = {
            id: users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1,
            name,
            email,
        };

        users.push(newUser);

        res.status(201).json({
            success: true,
            data: newUser,
            message: "사용자가 성공적으로 생성되었습니다.",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: "사용자 생성 중 오류가 발생했습니다.",
        });
    }
});

// PUT /api/users/:id - 사용자 수정
router.put("/users/:id", (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, email } = req.body;

        const userIndex = users.findIndex((u) => u.id === id);

        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                error: "사용자를 찾을 수 없습니다.",
                message: `ID ${id}에 해당하는 사용자가 없습니다.`,
            });
        }

        if (name) users[userIndex].name = name;
        if (email) users[userIndex].email = email;

        res.json({
            success: true,
            data: users[userIndex],
            message: "사용자가 성공적으로 수정되었습니다.",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: "사용자 수정 중 오류가 발생했습니다.",
        });
    }
});

// DELETE /api/users/:id - 사용자 삭제
router.delete("/users/:id", (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const userIndex = users.findIndex((u) => u.id === id);

        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                error: "사용자를 찾을 수 없습니다.",
                message: `ID ${id}에 해당하는 사용자가 없습니다.`,
            });
        }

        const deletedUser = users.splice(userIndex, 1)[0];

        res.json({
            success: true,
            data: deletedUser,
            message: "사용자가 성공적으로 삭제되었습니다.",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: "사용자 삭제 중 오류가 발생했습니다.",
        });
    }
});

// ============ 여행 관련 API ============

// GET /api/trips - 모든 여행 조회
router.get("/trips", (req, res) => {
    try {
        res.json({
            success: true,
            data: trips,
            message: "여행 목록을 성공적으로 조회했습니다.",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: "여행 목록 조회 중 오류가 발생했습니다.",
        });
    }
});

// GET /api/trips/:id - 특정 여행 조회
router.get("/trips/:id", (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const trip = trips.find((t) => t.id === id);

        if (!trip) {
            return res.status(404).json({
                success: false,
                error: "여행을 찾을 수 없습니다.",
                message: `ID ${id}에 해당하는 여행이 없습니다.`,
            });
        }

        res.json({
            success: true,
            data: trip,
            message: "여행을 성공적으로 조회했습니다.",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: "여행 조회 중 오류가 발생했습니다.",
        });
    }
});

// POST /api/trips - 여행 생성
router.post("/trips", (req, res) => {
    try {
        const { destination, budget, peopleCount } = req.body;

        if (!destination || !budget || !peopleCount) {
            return res.status(400).json({
                success: false,
                error: "필수 필드가 누락되었습니다.",
                message: "destination, budget, peopleCount는 필수입니다.",
            });
        }

        const newTrip = {
            id: trips.length > 0 ? Math.max(...trips.map((t) => t.id)) + 1 : 1,
            destination,
            budget: parseInt(budget),
            peopleCount: parseInt(peopleCount),
        };

        trips.push(newTrip);

        res.status(201).json({
            success: true,
            data: newTrip,
            message: "여행이 성공적으로 생성되었습니다.",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: "여행 생성 중 오류가 발생했습니다.",
        });
    }
});

// GET /api/recommendations - 여행 추천
router.get("/recommendations", (req, res) => {
    try {
        const { budget, peopleCount, region } = req.query;

        // 간단한 추천 로직 (실제로는 더 복잡한 알고리즘 사용)
        let recommendations = trips.filter((trip) => {
            if (budget && trip.budget > parseInt(budget)) return false;
            if (peopleCount && trip.peopleCount !== parseInt(peopleCount))
                return false;
            if (region && !trip.destination.includes(region)) return false;
            return true;
        });

        res.json({
            success: true,
            data: recommendations,
            message: "추천 여행 목록을 성공적으로 조회했습니다.",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: "추천 여행 조회 중 오류가 발생했습니다.",
        });
    }
});

// 호텔 및 항공편 관련 API는 routes/hotels.js에서 Amadeus API로 처리됩니다.

// 헬스 체크 엔드포인트
router.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "API 서버가 정상적으로 작동 중입니다.",
        timestamp: new Date().toISOString(),
    });
});

module.exports = router;
