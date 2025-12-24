require("dotenv").config({
    path: require("path").join(__dirname, "..", ".env"),
});
const express = require("express");
const axios = require("axios");
const router = express.Router();

// Amadeus API 인증 토큰 발급 함수
async function getAmadeusToken() {
    try {
        const apiKey = process.env.AMADEUS_API_KEY;
        const apiSecret = process.env.AMADEUS_API_SECRET;

        if (!apiKey || !apiSecret) {
            throw new Error(
                "AMADEUS_API_KEY 또는 AMADEUS_API_SECRET이 설정되지 않았습니다."
            );
        }

        console.log("Amadeus 토큰 발급 시도...");

        const response = await axios.post(
            "https://test.api.amadeus.com/v1/security/oauth2/token",
            new URLSearchParams({
                grant_type: "client_credentials",
                client_id: apiKey,
                client_secret: apiSecret,
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        if (!response.data.access_token) {
            throw new Error("토큰 발급 실패: access_token이 응답에 없습니다.");
        }

        console.log("Amadeus 토큰 발급 성공");
        return response.data.access_token;
    } catch (error) {
        console.error("Amadeus 토큰 발급 오류:", {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message,
        });
        throw error;
    }
}

// GET /hotels - 호텔 검색
router.get("/hotels", async (req, res) => {
    try {
        const { cityCode, checkInDate, checkOutDate, adults } = req.query;

        if (!cityCode) {
            return res.status(400).json({
                success: false,
                error: "cityCode 파라미터가 필요합니다. (예: OSA, NRT, ICN)",
            });
        }

        const token = await getAmadeusToken();

        const params = {
            cityCode: cityCode.toUpperCase(),
        };

        if (checkInDate) params.checkInDate = checkInDate;
        if (checkOutDate) params.checkOutDate = checkOutDate;
        if (adults) params.adults = adults;

        const response = await axios.get(
            "https://test.api.amadeus.com/v2/shopping/hotel-offers",
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                params: params,
            }
        );

        res.json({
            success: true,
            data: response.data,
        });
    } catch (error) {
        console.log("호텔 검색 오류:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            success: false,
            error: error.response?.data || error.message,
        });
    }
});

// GET /hotels/:hotelId - 호텔 상세 정보 조회
router.get("/hotels/:hotelId", async (req, res) => {
    try {
        const { hotelId } = req.params;
        const { checkInDate, checkOutDate, adults } = req.query;

        if (!hotelId) {
            return res.status(400).json({
                success: false,
                error: "hotelId 파라미터가 필요합니다.",
            });
        }

        const token = await getAmadeusToken();

        const params = {
            hotelIds: hotelId,
        };

        if (checkInDate) params.checkInDate = checkInDate;
        if (checkOutDate) params.checkOutDate = checkOutDate;
        if (adults) params.adults = adults;

        const response = await axios.get(
            "https://test.api.amadeus.com/v2/shopping/hotel-offers/by-hotel",
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                params: params,
            }
        );

        res.json({
            success: true,
            data: response.data,
        });
    } catch (error) {
        console.log(
            "호텔 상세 정보 조회 오류:",
            error.response?.data || error.message
        );
        res.status(error.response?.status || 500).json({
            success: false,
            error: error.response?.data || error.message,
        });
    }
});

// GET /hotels/compare - 호텔 가격 비교
router.get("/hotels/compare", async (req, res) => {
    try {
        const { cityCode, checkInDate, checkOutDate, adults, hotelIds } =
            req.query;

        if (!cityCode && !hotelIds) {
            return res.status(400).json({
                success: false,
                error: "cityCode 또는 hotelIds 파라미터가 필요합니다.",
            });
        }

        const token = await getAmadeusToken();

        const params = {};
        if (cityCode) params.cityCode = cityCode.toUpperCase();
        if (hotelIds) params.hotelIds = hotelIds;
        if (checkInDate) params.checkInDate = checkInDate;
        if (checkOutDate) params.checkOutDate = checkOutDate;
        if (adults) params.adults = adults;

        const response = await axios.get(
            "https://test.api.amadeus.com/v2/shopping/hotel-offers",
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                params: params,
            }
        );

        // 가격 비교를 위한 데이터 가공
        const hotels = response.data?.data || [];
        const comparison = hotels.map((hotel) => {
            const offers = hotel.offers || [];
            const prices = offers.map((offer) => ({
                price: offer.price?.total || "N/A",
                currency: offer.price?.currency || "USD",
                roomType: offer.room?.type || "Standard",
                boardType: offer.boardType || "Room only",
            }));

            return {
                hotelId: hotel.hotel?.hotelId,
                hotelName: hotel.hotel?.name,
                address: hotel.hotel?.address,
                prices: prices,
                lowestPrice:
                    offers.length > 0
                        ? offers.reduce((min, offer) => {
                              const current = parseFloat(
                                  offer.price?.total || Infinity
                              );
                              return current < min ? current : min;
                          }, Infinity)
                        : null,
            };
        });

        // 가격 순으로 정렬
        comparison.sort((a, b) => {
            const priceA = a.lowestPrice || Infinity;
            const priceB = b.lowestPrice || Infinity;
            return priceA - priceB;
        });

        res.json({
            success: true,
            data: {
                comparison: comparison,
                original: response.data,
            },
        });
    } catch (error) {
        console.log(
            "호텔 가격 비교 오류:",
            error.response?.data || error.message
        );
        res.status(error.response?.status || 500).json({
            success: false,
            error: error.response?.data || error.message,
        });
    }
});

// ============ 항공편 관련 API ============

// GET /flights/offers - 항공권 가격 검색 (Flight Offers Search)
router.get("/flights/offers", async (req, res) => {
    try {
        const {
            originLocationCode,
            destinationLocationCode,
            departureDate,
            returnDate,
            adults,
            children,
            infants,
            travelClass,
            currencyCode,
            maxPrice,
            max,
            nonStop,
        } = req.query;

        // 필수 파라미터 검증
        if (!originLocationCode || !destinationLocationCode || !departureDate) {
            return res.status(400).json({
                success: false,
                error: "필수 파라미터가 누락되었습니다.",
                message:
                    "originLocationCode, destinationLocationCode, departureDate는 필수입니다.",
                example: {
                    originLocationCode: "ICN",
                    destinationLocationCode: "NRT",
                    departureDate: "2025-03-15",
                    adults: 1,
                    max: 10,
                },
            });
        }

        // 날짜 유효성 검증
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const departure = new Date(departureDate);
        departure.setHours(0, 0, 0, 0);

        // 출발 날짜가 오늘보다 이전인지 확인
        if (departure < today) {
            return res.status(400).json({
                success: false,
                error: "출발 날짜가 유효하지 않습니다.",
                message: "출발 날짜는 오늘 이후여야 합니다.",
            });
        }

        // 출발 날짜가 너무 미래인지 확인 (보통 1년 이내)
        const maxDate = new Date(today);
        maxDate.setFullYear(today.getFullYear() + 1);
        if (departure > maxDate) {
            return res.status(400).json({
                success: false,
                error: "출발 날짜가 너무 미래입니다.",
                message: "출발 날짜는 오늘로부터 1년 이내여야 합니다.",
            });
        }

        // 왕복인 경우 귀국 날짜 검증
        if (returnDate) {
            const returnD = new Date(returnDate);
            returnD.setHours(0, 0, 0, 0);

            if (returnD <= departure) {
                return res.status(400).json({
                    success: false,
                    error: "귀국 날짜가 유효하지 않습니다.",
                    message: "귀국 날짜는 출발 날짜보다 이후여야 합니다.",
                });
            }

            // 귀국 날짜가 너무 미래인지 확인
            if (returnD > maxDate) {
                return res.status(400).json({
                    success: false,
                    error: "귀국 날짜가 너무 미래입니다.",
                    message: "귀국 날짜는 오늘로부터 1년 이내여야 합니다.",
                });
            }
        }

        console.log("항공권 가격 검색 요청:", {
            originLocationCode,
            destinationLocationCode,
            departureDate,
            returnDate,
            adults,
            children,
            infants,
            travelClass,
            currencyCode,
            maxPrice,
            max,
            nonStop,
        });

        // 토큰 발급
        let token;
        try {
            token = await getAmadeusToken();
        } catch (tokenError) {
            return res.status(500).json({
                success: false,
                error: {
                    message: "Amadeus API 토큰 발급 실패",
                    detail: tokenError.response?.data || tokenError.message,
                    suggestion:
                        ".env 파일에 AMADEUS_API_KEY와 AMADEUS_API_SECRET이 올바르게 설정되어 있는지 확인하세요.",
                },
            });
        }

        // 파라미터 구성
        const params = {
            originLocationCode: originLocationCode.toUpperCase(),
            destinationLocationCode: destinationLocationCode.toUpperCase(),
            departureDate: departureDate,
        };

        // 선택 파라미터 추가
        if (returnDate) params.returnDate = returnDate;
        if (adults) params.adults = parseInt(adults) || 1;
        if (children) params.children = parseInt(children);
        if (infants) params.infants = parseInt(infants);
        if (travelClass) params.travelClass = travelClass.toUpperCase(); // ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST
        if (currencyCode) params.currencyCode = currencyCode.toUpperCase();
        if (maxPrice) params.maxPrice = parseInt(maxPrice);
        if (max) params.max = parseInt(max) || 10;
        if (nonStop) params.nonStop = nonStop === "true";

        console.log("Flight Offers Search API 호출:", {
            url: "https://test.api.amadeus.com/v2/shopping/flight-offers",
            params: params,
        });

        const response = await axios.get(
            "https://test.api.amadeus.com/v2/shopping/flight-offers",
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                params: params,
                validateStatus: function (status) {
                    return status < 600;
                },
            }
        );

        console.log("Flight Offers Search API 응답 상태:", response.status);

        // Amadeus API가 에러를 반환한 경우
        if (response.status >= 400 || response.data?.errors) {
            const errorCode = response.data?.errors?.[0]?.code;
            const errorTitle = response.data?.errors?.[0]?.title;
            const errorDetail = response.data?.errors?.[0]?.detail;

            // 에러 코드 141에 대한 특별 처리
            if (errorCode === 141) {
                return res.status(response.status || 500).json({
                    success: false,
                    error: response.data,
                    debug: {
                        requestParams: params,
                        responseStatus: response.status,
                    },
                    suggestions: [
                        "날짜가 너무 미래일 수 있습니다. (보통 1년 이내만 지원)",
                        "테스트 환경에서는 특정 날짜 범위만 지원할 수 있습니다.",
                        "출발 날짜를 오늘로부터 1-6개월 사이로 변경해보세요.",
                        "returnDate가 departureDate보다 최소 1일 이상 이후인지 확인하세요.",
                        "currencyCode를 제거하거나 다른 통화(USD, EUR)로 시도해보세요.",
                        "프로덕션 환경으로 전환을 고려해보세요.",
                    ],
                });
            }

            return res.status(response.status || 500).json({
                success: false,
                error: response.data,
                debug: {
                    requestParams: params,
                    responseStatus: response.status,
                },
            });
        }

        // 응답 데이터 가공
        const flightData = response.data;
        const summary = {
            totalResults: flightData.data?.length || 0,
            cheapestPrice: null,
            cheapestCurrency: null,
            airlines: [],
        };

        if (flightData.data && flightData.data.length > 0) {
            // 최저가 찾기
            const prices = flightData.data.map((offer) =>
                parseFloat(offer.price?.total || Infinity)
            );
            const cheapestIndex = prices.indexOf(Math.min(...prices));
            const cheapestOffer = flightData.data[cheapestIndex];

            summary.cheapestPrice = cheapestOffer.price?.total;
            summary.cheapestCurrency = cheapestOffer.price?.currency;

            // 항공사 코드 수집
            const airlineCodes = new Set();
            flightData.data.forEach((offer) => {
                offer.validatingAirlineCodes?.forEach((code) =>
                    airlineCodes.add(code)
                );
            });
            summary.airlines = Array.from(airlineCodes);
        }

        console.log("Flight Offers Search API 응답 성공");
        res.json({
            success: true,
            data: flightData,
            summary: summary,
        });
    } catch (error) {
        console.error("항공권 가격 검색 오류:", {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message,
            stack: error.stack,
        });

        if (error.response?.data?.errors) {
            return res.status(error.response.status).json({
                success: false,
                error: error.response.data,
            });
        }

        res.status(error.response?.status || 500).json({
            success: false,
            error: {
                message: error.message,
                detail:
                    error.response?.data || "알 수 없는 오류가 발생했습니다.",
                type: error.name,
            },
        });
    }
});

// GET /flights/destinations - 항공편 목적지 검색 (Flight Inspiration Search)
router.get("/flights/destinations", async (req, res) => {
    try {
        const { origin, maxPrice } = req.query;

        if (!origin) {
            return res.status(400).json({
                success: false,
                error: "origin 파라미터가 필요합니다. (예: PAR, NRT, ICN)",
            });
        }

        console.log("항공편 목적지 검색 요청:", { origin, maxPrice });

        // 토큰 발급
        let token;
        try {
            token = await getAmadeusToken();
        } catch (tokenError) {
            return res.status(500).json({
                success: false,
                error: {
                    message: "Amadeus API 토큰 발급 실패",
                    detail: tokenError.response?.data || tokenError.message,
                    suggestion:
                        ".env 파일에 AMADEUS_API_KEY와 AMADEUS_API_SECRET이 올바르게 설정되어 있는지 확인하세요.",
                },
            });
        }

        const params = {
            origin: origin.toUpperCase(),
        };

        if (maxPrice) {
            params.maxPrice = parseInt(maxPrice);
        }

        console.log("Amadeus API 호출:", {
            url: "https://test.api.amadeus.com/v1/shopping/flight-destinations",
            params: params,
        });

        console.log("토큰 발급 완료, API 호출 시작...");
        console.log(
            "요청 URL:",
            `https://test.api.amadeus.com/v1/shopping/flight-destinations?origin=${
                params.origin
            }${params.maxPrice ? `&maxPrice=${params.maxPrice}` : ""}`
        );
        console.log(
            "Authorization 헤더:",
            `Bearer ${token.substring(0, 20)}...`
        );

        const response = await axios.get(
            "https://test.api.amadeus.com/v1/shopping/flight-destinations",
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                params: params,
                validateStatus: function (status) {
                    // 모든 상태 코드를 허용하여 에러 응답도 받을 수 있도록 함
                    return status < 600;
                },
            }
        );

        console.log("Amadeus API 응답 상태:", response.status);
        console.log(
            "Amadeus API 응답 데이터:",
            JSON.stringify(response.data).substring(0, 200)
        );

        // Amadeus API가 에러를 반환한 경우
        if (response.status >= 400 || response.data?.errors) {
            const errorCode = response.data?.errors?.[0]?.code;
            const errorDetail = response.data?.errors?.[0]?.detail;

            // 에러 코드 141에 대한 특별 처리
            if (errorCode === 141) {
                return res.status(response.status || 500).json({
                    success: false,
                    error: response.data,
                    debug: {
                        requestParams: params,
                        responseStatus: response.status,
                    },
                    suggestions: [
                        "Flight Inspiration Search API는 제한된 출발지-도착지 쌍만 지원합니다.",
                        "다른 출발지 코드를 시도해보세요 (예: NRT, ICN, JFK).",
                        "maxPrice 파라미터 없이 시도해보세요.",
                        "테스트 환경에서는 데이터가 제한적일 수 있습니다.",
                        "프로덕션 환경으로 전환을 고려해보세요.",
                    ],
                });
            }

            return res.status(response.status || 500).json({
                success: false,
                error: response.data,
                debug: {
                    requestParams: params,
                    responseStatus: response.status,
                },
            });
        }

        console.log("Amadeus API 응답 성공");
        res.json({
            success: true,
            data: response.data,
        });
    } catch (error) {
        console.error("항공편 목적지 검색 오류:", {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message,
            stack: error.stack,
        });

        // Amadeus API 에러 형식에 맞춰 응답
        if (error.response?.data?.errors) {
            return res.status(error.response.status).json({
                success: false,
                error: error.response.data,
                debug: {
                    message: "Amadeus API 서버 오류가 발생했습니다.",
                    suggestion:
                        "API 키가 유효한지, Amadeus 개발자 포털에서 확인해주세요.",
                },
            });
        }

        res.status(error.response?.status || 500).json({
            success: false,
            error: {
                message: error.message,
                detail:
                    error.response?.data || "알 수 없는 오류가 발생했습니다.",
                type: error.name,
            },
        });
    }
});

// GET /flights/offers/multiple - 여러 목적지에 대한 항공권 검색 (예산 기반)
router.get("/flights/offers/multiple", async (req, res) => {
    console.log("✅ /flights/offers/multiple 엔드포인트 호출됨");
    console.log("요청 쿼리:", req.query);
    try {
        const {
            originLocationCode,
            departureDate,
            returnDate,
            adults,
            children,
            infants,
            travelClass,
            currencyCode,
            max,
            nonStop,
            maxPrice,
        } = req.query;

        // 필수 파라미터 검증
        if (!originLocationCode || !departureDate) {
            return res.status(400).json({
                success: false,
                error: "필수 파라미터가 누락되었습니다.",
                message: "originLocationCode, departureDate는 필수입니다.",
            });
        }

        // 인기 목적지 리스트 (한국에서 자주 가는 곳들)
        const popularDestinations = [
            { code: "CJU", name: "제주" },
            { code: "NRT", name: "도쿄(나리타)" },
            { code: "HND", name: "도쿄(하네다)" },
            { code: "KIX", name: "오사카" },
            { code: "FUK", name: "후쿠오카" },
            { code: "NGO", name: "나고야" },
            { code: "BKK", name: "방콕" },
            { code: "SIN", name: "싱가포르" },
            { code: "HKG", name: "홍콩" },
            { code: "TPE", name: "타이베이" },
            { code: "PEK", name: "베이징" },
            { code: "PVG", name: "상하이" },
            { code: "DPS", name: "발리" },
            { code: "MNL", name: "마닐라" },
            { code: "GMP", name: "김포" }, // 국내선
        ];

        console.log("여러 목적지 항공권 검색 요청:", {
            originLocationCode,
            departureDate,
            returnDate,
            maxPrice,
            destinations: popularDestinations.length,
        });

        // 토큰 발급
        let token;
        try {
            token = await getAmadeusToken();
        } catch (tokenError) {
            return res.status(500).json({
                success: false,
                error: {
                    message: "Amadeus API 토큰 발급 실패",
                    detail: tokenError.response?.data || tokenError.message,
                },
            });
        }

        // 모든 목적지에 대해 병렬로 검색
        const searchPromises = popularDestinations.map(async (dest) => {
            try {
                const params = {
                    originLocationCode: originLocationCode.toUpperCase(),
                    destinationLocationCode: dest.code,
                    departureDate: departureDate,
                    adults: parseInt(adults) || 1,
                };

                if (returnDate) params.returnDate = returnDate;
                if (children) params.children = parseInt(children);
                if (infants) params.infants = parseInt(infants);
                if (travelClass) params.travelClass = travelClass.toUpperCase();
                if (currencyCode)
                    params.currencyCode = currencyCode.toUpperCase();
                if (max) params.max = parseInt(max) || 5; // 각 목적지당 최대 5개
                if (nonStop) params.nonStop = nonStop === "true";
                if (maxPrice) params.maxPrice = parseInt(maxPrice);

                const response = await axios.get(
                    "https://test.api.amadeus.com/v2/shopping/flight-offers",
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        params: params,
                        validateStatus: function (status) {
                            return status < 600;
                        },
                    }
                );

                // 성공한 경우에만 데이터 반환
                if (
                    response.status === 200 &&
                    response.data?.data?.length > 0
                ) {
                    return {
                        destination: dest,
                        success: true,
                        data: response.data.data,
                    };
                } else {
                    return {
                        destination: dest,
                        success: false,
                        error: response.data?.errors || "No flights found",
                    };
                }
            } catch (error) {
                return {
                    destination: dest,
                    success: false,
                    error: error.response?.data || error.message,
                };
            }
        });

        // 모든 검색 결과 대기
        const results = await Promise.all(searchPromises);

        // 성공한 결과만 필터링하고 데이터 합치기
        const successfulResults = results.filter((r) => r.success);
        const allFlights = [];

        successfulResults.forEach((result) => {
            result.data.forEach((flight) => {
                // 각 항공권에 목적지 정보 추가
                allFlights.push({
                    ...flight,
                    destinationInfo: result.destination,
                });
            });
        });

        // 가격 순으로 정렬
        allFlights.sort((a, b) => {
            const priceA = parseFloat(a.price?.total || Infinity);
            const priceB = parseFloat(b.price?.total || Infinity);
            return priceA - priceB;
        });

        // maxPrice가 있으면 필터링
        let filteredFlights = allFlights;
        if (maxPrice) {
            const maxPriceNum = parseInt(maxPrice);
            filteredFlights = allFlights.filter((flight) => {
                const price = parseFloat(flight.price?.total || Infinity);
                return price <= maxPriceNum;
            });
        }

        // 최종 결과 수 제한 (전체 최대 50개)
        const finalFlights = filteredFlights.slice(0, parseInt(max) || 50);

        console.log("여러 목적지 항공권 검색 완료:", {
            totalDestinations: popularDestinations.length,
            successfulDestinations: successfulResults.length,
            totalFlights: finalFlights.length,
        });

        res.json({
            success: true,
            data: {
                data: finalFlights,
            },
            summary: {
                totalDestinations: popularDestinations.length,
                successfulDestinations: successfulResults.length,
                totalFlights: finalFlights.length,
                cheapestPrice:
                    finalFlights.length > 0
                        ? finalFlights[0].price?.total
                        : null,
                cheapestCurrency:
                    finalFlights.length > 0
                        ? finalFlights[0].price?.currency
                        : null,
            },
        });
    } catch (error) {
        console.error("여러 목적지 항공권 검색 오류:", error);
        res.status(500).json({
            success: false,
            error: {
                message: error.message,
                detail:
                    error.response?.data || "알 수 없는 오류가 발생했습니다.",
            },
        });
    }
});

module.exports = router;
