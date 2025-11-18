
//Minimax Hailuo API url
const url = "https://api.minimax.io/v1/video_generation";
//options
const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.My_API_Key}`
    },
    body: '{"model":"MiniMax-Hailuo-2.3","prompt":"A man picks up a book [Pedestal up], then reads [Static shot].","duration":6,"resolution":"1080P"}'

}
//fetch API data for video generation
    try{
    const response = await fetch(url, options);
    const data = await response.json();
    console.log(data);
    } catch (error) {
        console.error("Error fetching Hailuo data:", error);
        throw error;
    }
