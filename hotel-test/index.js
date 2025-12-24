require("dotenv").config()
const axios = require("axios")

async function testHotelApi() {
  const options = {
    method: "GET",
    url: "https://hotels-api-dojo.p.rapidapi.com/locations/v3/search",
    headers: {
      "X-RapidAPI-Key": process.env.RAPID_API_KEY,
      "X-RapidAPI-Host": "hotels-api-dojo.p.rapidapi.com"
    },
    params: {
      query: "Osaka",
      locale: "ko_KR"
    }
  }

  try {
    const response = await axios.request(options)
    console.log(response.data)
  } catch (error) {
    console.error(error.response?.data || error.message)
  }
}

testHotelApi()


