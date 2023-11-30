'use strict';

// Application Dependencies
const express = require('express');
require('dotenv').config();
const cors = require('cors');
const superagent = require('superagent');
const petfinder = require("@petfinder/petfinder-js");

// Application Setup
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());

// Route Definitions
app.get('/', rootHandler);
app.get('/location', locationHandler);
app.get('/yelp', restaurantHandler);
app.get('/weather', weatherHandler);
app.get('/animal', animalHandler);
app.use('*', notFoundHandler);
app.use(errorHandler);

// Route Handlers
function rootHandler(request, response) {
    response.status(200).send('Hello World!');
}

function locationHandler(request, response) {
    const city = request.query.city;
    // const locationData = require('./data/location.json');
    const url = 'https://us1.locationiq.com/v1/search.php';
    superagent.get(url)
        .query({
            key: process.env.LOCATION_API,
            q: city,
            format: 'json'
        })
        .then(responseFromLocationIQ => {
            const topLocation = responseFromLocationIQ._body[0];
            const myLocationResponse = new Location(city, topLocation);
            response.status(200).send(myLocationResponse);
        })
        .catch(err => {
            console.log(err);
            errorHandler(err, request, response);
        });
    // const location = new Location(city, locationData);
    // response.status(200).send(location);
}

function restaurantHandler(request, response) {
    const queryString = request.query;
    const lat = parseFloat(request.query.latitude);
    const lon = parseFloat(request.query.longitude);
    const currentPage = request.query.page;
    const numPerPage = 4;
    const start = ((currentPage - 1) * numPerPage + 1);
    const url = 'https://api.yelp.com/v3/businesses/search';
    superagent.get(url)
        .query({
            latitude: lat,
            longitude: lon,
            limit: numPerPage,
            offset: start
        })
        .set('Authorization', `Bearer ${process.env.YELP_API}`)
        .then(yelpResponse => {
            const arrayOfRestaurants = yelpResponse.body.businesses;
            const restaurantsResults = [];
            arrayOfRestaurants.forEach(restaurant => {
                restaurantsResults.push(new Restaurant(restaurant));
            });
            response.status(200).send(restaurantsResults);
        })
        .catch(err => {
            console.log(err);
            errorHandler(err, request, response);
        });

    // const restaurantData = require('./data/restaurants.json');
    // const arrayOfRestaurants = restaurantData.businesses;
    // const restaurantsResults = [];
    // arrayOfRestaurants.forEach(restaurant => {
    //     restaurantsResults.push(new Restaurant(restaurant));
    // });
    // response.status(200).send(restaurantsResults);
}

function animalHandler(request, response) {
    const client = new petfinder.Client({apiKey: process.env.PETFINDER_API, secret: process.env.PETFINDER_SECRET});
    let animals;

    client.animal.search({
        type: "Dog",
        location: "41.90979292568401, -91.65074901204449",
        page: 1,
        limit: 5,
    })
        .then(function (response) {
            // response.data.animals.forEach(function(animal) {
                // console.log(` -- ${animal.name}\nid: ${animal.id}\nurl: ${animal.url}\n`);
            // });
            animals = response.data.animals;
        })
        .then(function() {
            animals.forEach(animal => {
                client.animal.show(animal.id)
                    .then(resp => {
                        console.log(resp.data.animal);
                    });
            })
        })
        .catch(function (error) {
            // Handle the error
        });

    // const url = 'https://api.petfinder.com/v2/oauth2/token';
    // superagent.post(url)
    //     .query({
    //         grant_type: "client_credentials",
    //         client_id: process.env.PETFINDER_API,
    //         client_secret: process.env.PETFINDER_SECRET
    //     })
    //     .set('Content-Type', 'application/json')
    //     .then(petFinderResponse => {
    //         const accessToken = petFinderResponse.accessToken;
    //         console.log(accessToken);
    //     })
    //     // .set('Authorization', `Bearer ${process.env.YELP_API}`)
    //     .catch(err => {
    //         console.log(err);
    //         errorHandler(err, request, response);
    //     });

}

function weatherHandler(request, response) {
    const queryString = request.query;
    const lat = parseFloat(request.query.latitude);
    const lon = parseFloat(request.query.longitude);
    const url = 'https://api.openweathermap.org/data/2.5/weather';
    superagent.get(url)
        .query({
            lat: lat,
            lon: lon,
            appid: process.env.WEATHER_API,
            units: "imperial"
        })
        .then(weatherResponse => {
            const weather = new Weather(weatherResponse.body);
            response.status(200).send(weather);
        })
        .catch(err => {
            console.log(err);
            errorHandler(err, request, response);
        });

}

function notFoundHandler(request, response) {
    response.status(404).json({ notFound: true });
}

function errorHandler(error, request, response, next) {
    response.status(500).json({ error: true, message: error.message });
}

// Constructors
function Location (city, locationData) {
    this.search_query = city;
    this.formatted_query = locationData.display_name;
    this.latitude = parseFloat(locationData.lat);
    this.longitude = parseFloat(locationData.lon);
}

function Restaurant(restaurantData) {
    this.name = restaurantData.name;
    this.url = restaurantData.url;
    this.rating = restaurantData.rating;
    this.price = restaurantData.price;
    this.image_url = restaurantData.image_url;
}

function Weather(weatherData) {
    this.description = weatherData.weather[0].description;
    const iconcode = weatherData.weather[0].icon;
    this.icon = `http://openweathermap.org/img/w/${iconcode}.png`
    this.current_temp = weatherData.main.temp;
    this.feels_like = weatherData.main.feels_like;
    this.min_temp = weatherData.main.temp_min;
    this.max_temp = weatherData.main.temp_max;
    this.wind_speed = weatherData.wind.speed;
    if(weatherData.wind.deg < 22.5 || weatherData.wind.deg >= 337.5) {
        this.wind_direction = "North"
    } else if(weatherData.wind.deg >= 22.5 && weatherData.wind.deg < 67.5) {
        this.wind_direction = "Northeast"
    } else if(weatherData.wind.deg >= 67.5 && weatherData.wind.deg < 112.5) {
        this.wind_direction = "Northeast"
    } else if(weatherData.wind.deg >= 112.5 && weatherData.wind.deg < 157.5) {
        this.wind_direction = "Southeast"
    } else if(weatherData.wind.deg >= 157.5 && weatherData.wind.deg < 202.5) {
        this.wind_direction = "South"
    } else if(weatherData.wind.deg >= 202.5 && weatherData.wind.deg < 247.5) {
        this.wind_direction = "Southwest"
    } else if(weatherData.wind.deg >= 247.5 && weatherData.wind.deg < 292.5) {
        this.wind_direction = "West"
    } else if(weatherData.wind.deg >= 292.5 && weatherData.wind.deg < 337.5) {
        this.wind_direction = "Northwest"
    }
    this.cloud_percent = weatherData.clouds.all;
    this.rain_volume_1hr = weatherData.hasOwnProperty('rain') ? weatherData.rain['1h'] : '';
    this.snow_volume_1hr = weatherData.hasOwnProperty('snow') ? weatherData.snow['1h'] : '';
    this.sunrise = new Date(weatherData.sys.sunrise * 1000 + weatherData.timezone * 1000).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', timeZone: 'UTC'});
    this.sunset = new Date(weatherData.sys.sunset * 1000 + weatherData.timezone * 1000).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', timeZone: 'UTC'});
}


// App listener
app.listen(PORT,() => console.log(`Listening on port ${PORT}`));