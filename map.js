var map;
var addresses = [];
var markers = [];
var origin;
var destination;
var directionsDisplay;
var infowindows = [];
var center;
var originMarker;
var travelMode;
var destinationAddress;

let wasteTypeColor = {
    "Barbeque Fork"                        : "#FF0000", // red
    "Clothes"                              : "#FFA500", // orange
    "Electrical and Electronic Equipment"  : "#800080", // purple
    "Fluorescent Lamp"                     : "#ADD8E6", // light blue
    "Glass Bottles"                        : "#008000", // green
    "Metals"                               : "#FFFF00", // yellow
    "Paper"                                : "#0000FF", // blue
    "Plastics"                             : "#8B4513", // brown
    "Rechargeable Batteries"               : "#999999"  // grey
}

//sync waste-types to user submit form
$('#waste-type input').each(function () {
    $(this).on('change', function () {
        let wasteType = $(this).val();
        let x = this.checked;
        $(`#recycle-form input[value="${wasteType}"]`).prop('checked', x);
    })
})

$('#recycle-form input').each(function () {
    $(this).on('change', function () {
        let wasteType = $(this).val();
        let x = this.checked;
        $(`#waste-type input[value="${wasteType}"]`).prop('checked', x);
    })
})

//prevent dropdown menu from closing itself by clicking
$('.dropdown-menu').on('click', function (e) {
    if ($(this).hasClass('dropdown-menu-form')) {
        e.stopPropagation();
    }
});

//add evnet handler for travel-mode menu
$('#travel-mode li').on('click', function () {
    $('#travel-mode li').removeClass("active");
    $(this).addClass('active');
    if (travelMode) {
        if ($(this).attr('data-id').toUpperCase() !== travelMode) {
            getDirection();
        }
    }
});

//submit user search form to server
$('#recycle-form').on('submit', function (e) {
    e.preventDefault();
    // var formData = $('#recycle-form').serializeArray();
    var wasteTypes = $('#recycle-form input[type="checkbox"]:checked').map(function () {
        return $(this).val();
    }).get();
    var data = {
        wasteTypes: wasteTypes,
        query: destinationAddress,
        latlng: [destination.lat(), destination.lng()]
    }
    $.post('/users/search', data)
        .catch(err => {
            console.log("Something went wrong! data is not saved!");
        }).done(()=> {
            clearSelectedOptions();
        })
    $('#modal-form').modal('hide');
    
});

function initMap() {
    getPosition().then(position => {
        //first to run to set current location
        origin = new google.maps.LatLng({ lat: position.coords.latitude, lng: position.coords.longitude });

        //attach event listener to show location button
        let showLocBtn = document.getElementById('showloc');
        showLocBtn.addEventListener('click', getNearbyRecyclingPoints);

        //attach event listener to search button
        let searchBtn = document.getElementById('searchloc').getElementsByTagName('button')[0];
        searchBtn.addEventListener('click', searchLocationsFromUserInput);

        //initiailize the google map and place marker on user location
        map = new google.maps.Map(document.getElementById('map'), {
            center: origin,
            zoom: 15,
            disableDefaultUI: true
        });
        originMarker = new google.maps.Marker({
            position: origin,
            map: map,
            title: 'Im here!',
            draggable: true,
            animation: google.maps.Animation.DROP,
            icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
        });
        var input = document.getElementById('location');
        
        //autocomplete API -- ORIGINAL CODE
        //was also suggesting non-HK locations
        //var autocomplete = new google.maps.places.Autocomplete(input);
        //autocomplete.bindTo('bounds', map);

        //autocomplete API -- NEW CODE
        //now ONLY suggest HK locations with country bias set
        var options = {
            componentRestrictions: {country: 'hk'}
          };       
        var autocomplete = new google.maps.places.Autocomplete(input, options);

    }).catch(err => {
        console.log(err);
    })
}

// function to fetch the nearby recycling points
function getNearbyRecyclingPoints() {
    var selectedOptions = $('#waste-type input[type="checkbox"]:checked').map(function () {
        return $(this).val();
    }).get();

    // to reset searchQuery field if the user is search via current location
    clearField();

    // selectedOptions = wastetypes selected in droplist
    // console.log("selectedOptions:" + selectedOptions);

    clearRoutes();
    axios.get('https://api.data.gov.hk/v1/nearest-recyclable-collection-points', {
        params: {
            lat: origin.lat(),
            long: origin.lng(),
            max: 10
        }
    }).then(response => {
        center = origin;
        createMarkerAndInfoWindows(response, selectedOptions);
        // For Search result list rendering
        //console.log(response.data.results);

        //var resultData = response.data.results;
        //console.log(resultData[0]["waste-type"]);

    }).catch(err => {
        console.log(err);
    });
}

function clearField() {
    var reset_input = document.getElementById("location");
    reset_input.value = "";
}

//adjust the map boundary
function adjustBounds() {
    var bounds = new google.maps.LatLngBounds();
    // Extend the boundaries of the map for each marker and display the marker
    for (marker of markers) {
        bounds.extend(marker.position);
    }
    // bounds.extend(originMarker.position);
    map.fitBounds(bounds);
}

// function adjustBounds(center,zoom=15) {
//     map.setCenter(center);
//     map.setZoom(zoom);
// }

// function getting geolocation from browser
function getPosition() {
    return new Promise(function (resolve, reject) {
        navigator.geolocation.getCurrentPosition(resolve, reject);
    });
};

//handle user query
function searchLocationsFromUserInput() {
    clearRoutes();
    var searchQuery = document.getElementById('searchloc').getElementsByTagName('input')[0].value;
    console.log(searchQuery)
    axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
            address: searchQuery,
            key: 'AIzaSyBTb0ALJcvvU_k_9YUcWUGXKhdyUYLpws8',
        }
    }).then(response => {
        center = response.data.results[0].geometry.location;
        var lat = response.data.results[0].geometry.location.lat;
        var lng = response.data.results[0].geometry.location.lng;
        axios.get('https://api.data.gov.hk/v1/nearest-recyclable-collection-points', {
            params: {
                lat: lat,
                long: lng,
                max: 10
            }
        }).then(response => {
            var selectedOptions = $('#waste-type input[type="checkbox"]:checked').map(function () {
                return $(this).val();
            }).get();
            createMarkerAndInfoWindows(response, selectedOptions);
            // for testing
            //console.log(searchQuery);

        }).catch(err => {
            console.log(err);
        });
    }).catch(err => {
        console.log(err);
    })
}


// For Search result list rendering
var resultDisplay = document.getElementById("list");

// clear results list displayed for new search query
function clearResult() {
    resultDisplay.innerHTML = "";
}

// For Search result list rendering (this part is now under function createMarkerAndInfoWindows)
// function renderData(data, location) {
//     var listResult = "";
//     var listHeading = "<br><h5>" + "Recycling Points near <br> your entered location: " + location + "</h5>";
//     var backToMap = "<button id='tomap' class='btn btn-green btn-default btn-block' onclick='location.href=\"#pagelink\"' style='cursor:pointer;'>Back to Map</button>";

//     //console.log("TEST RESULT:" + data);

//     for (i = 0; i < data.length; i++) {
//         listResult += "<div id='listBox' onclick='location.href=\"#pagelink\"' style='cursor:pointer;'>" +
//             "<strong>" + data[i]["address1-en"] + "</strong><br>" +
//             "<p>" + data[i]["address1-zh-hant"] + "<br><br>"
//             + "<strong>" + "recyclable waste-type accepted:" + "</strong><br>"
//             + data[i]["waste-type"] + "</p>" + "</div>";
//     }
//     resultDisplay.insertAdjacentHTML('beforeend', listHeading);
//     resultDisplay.insertAdjacentHTML('beforeend', listResult);

//     //to add Back to Map link at the end of the search result list
//     resultDisplay.insertAdjacentHTML('beforeend', backToMap);
// }

// clearing the markers
function clearMarkers() {
    for (marker of markers) {
        marker.setMap(null);
    }
}

//create markers and infowindows
function createMarkerAndInfoWindows(response, selectedOptions) {
    addresses = [];
    for (address of response.data.results) {
        let wasteTypes = address["waste-type"].split(",");
        address.wasteTypes = wasteTypes;
        addresses.push(address);
    }

    clearMarkers();
    markers = [];
    infoWindows = [];

    // for search result list rendering
    var listHeading = "<br><h5>" + "Recycling Points near your current location:" + "</h5>";
    const backToMap = "<button id='tomap' class='btn btn-green btn-default btn-block' onclick='location.href=\"#map-container\"' style='cursor:pointer;'><span class='glyphicon glyphicon-map-marker'></span> Back to Map</button>";
    let noSearchResult = "<div id='listBox' onclick='location.href=\"#map-container\"' style='cursor:pointer;'>" +
        "<strong>There is currently no Recyclable Points available<br>that accept the waste types you have selected</strong><br>" +
        "<br><br>" +
        "<strong>Search again with different waste-type selection</strong><br>" + "</div>";
    let listResult = "";

    var searchQuery = document.getElementById('searchloc').getElementsByTagName('input')[0].value;
    console.log("searchQuery is " + searchQuery);

    // to enter searchQuery into the listHeading
    if (searchQuery != 0) {
        console.log("has SearchQuery");
        var listHeading = "<br><h5>" + "Recycling Points near <br> your entered location: " + "<h7>" + searchQuery + "</h7></h5>";
    } else {
        console.log("no SearchQuery");
    }


    // .filter returns the address that matches the wasteTypes selected
    // .every returns true/false 
    let filteredList = addresses.filter((e) => selectedOptions.every(option => {
        return e["wasteTypes"].includes(option);
    }));
    //console.log("filteredList.length: ", filteredList.length);
    // if no search result that matches the condition of the search criteria
    if (filteredList.length === 0) {
        clearResult();
        resultDisplay.insertAdjacentHTML('beforeend', noSearchResult);
        alert("Sorry, there is no recyclable points that match your search criteria please search again.");
        // clear location/places user typed in as searchQuery
        clearField();
        // clear selectedOptions to default status (nothing selected)
        clearSelectedOptions();
        return;
    }

    for (address of filteredList) {
        //filter out user selection
        // if (selectedOptions.every(option => {
        //     return address["wasteTypes"].includes(option);
        // })) {
        let marker = new google.maps.Marker({
            position: { lat: address["lat-long"][0], lng: address["lat-long"][1] },
            map: map,
            title: address["address1-zh-hant"],
            animation: google.maps.Animation.DROP
        });
        createInfoWindow(marker, address);
        markers.push(marker);

        //render the address/result filtered into the list

        clearResult();
        listResult += renderResult(address);
        //console.log("address:" + address);
        //console.log(Object.keys(addresses).length);
        //console.log(Object.keys(address).length);
        // console.log(address);  // 3 objects returned
        //var length = Object.keys(address).length;

    }
    resultDisplay.insertAdjacentHTML('beforeend', listHeading);
    resultDisplay.insertAdjacentHTML('beforeend', listResult);
    resultDisplay.insertAdjacentHTML('beforeend', backToMap);

    addresses = [];
    adjustBounds();
}

// to reset selectedOptions to default if no search result to display
function clearSelectedOptions() {
    $('#waste-type input[type="checkbox"]:checked').prop('checked', false);
    $('#recycle-form input').prop('checked', false);
}

//create infowindow helper
function createInfoWindow(marker, address) {

    let contentString = `
                        <div id="mapbox"> <p>Address: ${address["address1-en"]} <br>
                        Recycling Type: ${address["waste-type"]} <br></p>
                        <input type="button" class="btn-green" id="routebtn" value="Show route" onclick="getDirection(); closeInfoWindows()" data-toggle="modal" data-target="#modal-form"></input>
                        </div>`;
    // data-toggle="modal" data-target="#myModal"
    let infowindow = new google.maps.InfoWindow({
        content: contentString
    });
    infowindows.push(infowindow);

    google.maps.event.addListener(marker, "click", function (event) {
        destinationAddress = address['address1-en'];
        destination = this.position;
        closeInfoWindows();
        infowindow.open(map, marker);
    }); //end addListener
}

//get direction
function getDirection() {
    travelMode = $('#travel-mode li[class="active"]').attr('data-id').toUpperCase();
    let directionsService = new google.maps.DirectionsService;
    directionsService.route({
        origin: origin,
        destination: destination,
        travelMode: travelMode
    }, (response, status) => {
        if (status === "OK") {
            if (directionsDisplay) {
                directionsDisplay.setMap(null);
            }
            directionsDisplay = new google.maps.DirectionsRenderer({
                map: map,
                directions: response,
                draggable: true,
                polylineOptions: {
                    strokeColor: 'blue'
                }
            });
            // console.log(travelMode);
        } else {
            window.alert('Directions request failed due to ' + status);
        }
    })
}

// render search result list - current location search
function renderResult(address) {
    var errorMessage = "<p> Sorry there is no search result for your search selection </p>";
    var listResult = "",
        // listHeading = "<br><h5>" + "Recycling Points near <br> your current/selected location:" + "</h5>",
        // backToMap = "<button id='tomap' class='btn btn-green btn-default btn-block' onclick='location.href=\"#pagelink\"' style='cursor:pointer;'>Back to Map</button>",
        addressEn = address["address1-en"],
        addressCh = address["address1-zh-hant"],
        wasteType = address["waste-type"];

    let wasteColoredType = wasteType.split(",").map(type => {
        return "<span style='padding: 5px; background-color: " + wasteTypeColor[type] + "'>" + type + "</span>";;
    });
    // console.log(wasteColoredType);

    listResult += "<div id='listBox' onclick='location.href=\"#map-container\"' style='cursor:pointer;'>" +
        "<strong>" + addressEn + "</strong><br>" +
        "<p>" + addressCh + "<br><br>" +
        "<strong>" + "recyclable waste-type accepted:" + "</strong><br><br>" +
        wasteColoredType.join(" ") + "</p>" + "</div>";
    return listResult;
    /* if (address != 0) {
         
         console.log("there is result matched to render");
     } else {
         return errorMessage;
         console.log("return error message");
     }*/

}

//close all infowindows
function closeInfoWindows() {
    for (infoWindow of infowindows) {
        infoWindow.close();
    }
}
//clear route display
function clearRoutes() {
    if (directionsDisplay) {
        directionsDisplay.setMap(null);
    }
}





    

