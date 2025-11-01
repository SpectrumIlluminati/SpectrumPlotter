/*

To create a webpage with JavaScript and LeafletJS where the user can drop a pin and a popup then asks for a size in kilometers to draw an overlay surrounding the pin, you would need to do the following:

Set up a basic HTML page with a div element to hold the map.
Include the LeafletJS library in your page by adding the appropriate script and link tags to the head of your HTML document.
Initialize a Leaflet map object and add it to the div element you created earlier.
Add an event listener to the map object that listens for clicks. When the map is clicked, create a new marker at the click location and add it to the map.
When the marker is added, open a popup that asks the user for a size in kilometers.
Once the user enters a size, use that value to draw a circle overlay on the map centered on the marker location with a radius equal to the entered size in kilometers.
Here’s an example code snippet that demonstrates these steps:

*/
      
      // listen for clicks on map
      map.on("click", function (e) {
        // get a random color for the circle
        const randomHexColor = () => {
          // Generate a random 2 digit hex number, padded with a 0 if necessary
          const part = () =>
            Math.floor(Math.random() * 256)
              .toString(16)
              .padStart(2, "0");
          const r = part();
          const g = part();
          const b = part();
          return `#${r}${g}${b}`;
        };
        
        
        // function to convert decimal degrees to DMS.  Got these two functions from here:
        // https://stackoverflow.com/questions/37893131/how-to-convert-lat-long-from-decimal-degrees-to-dms-format
        function toDegreesMinutesAndSeconds(coordinate) {
          var absolute = Math.abs(coordinate);
          var degrees = Math.floor(absolute);
          var minutesNotTruncated = (absolute - degrees) * 60;
          var minutes = Math.floor(minutesNotTruncated);
          var seconds = Math.floor((minutesNotTruncated - minutes) * 60);

          return degrees + " " + minutes + " " + seconds;
        }

        // function to do DMS with the N/S E/W
        function convertDMS(lat, lng) {
          var latitude = toDegreesMinutesAndSeconds(lat);
          var latitudeCardinal = lat >= 0 ? "N" : "S";

          var longitude = toDegreesMinutesAndSeconds(lng);
          var longitudeCardinal = lng >= 0 ? "E" : "W";

          return (
            latitude +
            " " +
            latitudeCardinal +
            "\n" +
            longitude +
            " " +
            longitudeCardinal
          );
        }

        // get lat and long and convert to DMS
        var latDecDeg = e.latlng.lat;
        var lngDecDeg = e.latlng.lng;
        var coords = convertDMS(latDecDeg, lngDecDeg);
        
                    // open popup asking for a label (i.e. serial number)
                    var serialNumber = prompt(
                         "Enter a label (i.e. serial number)"
                    );

                    // open popup asking for power in watts
                    var power = prompt(
                         "Enter power (in Watts, Kilowatts, Milliwatts, etc.)"
                    );

                    // open popup asking for size in km
                    var sizeInKm = prompt("Enter radius size in kilometers:");

        

        // Combine the vars to make a single var for the multiline tooltip
        var combinedInfo = `<strong> Serial Number: </strong> ${serialNumber} <br><strong> Power: </strong> ${power} <br><strong> Radius: </strong> ${sizeInKm} km<br><strong> Lat/Long: </strong> ${coords} `;

        // draw circle overlay with entered size
        var circle = L.circle(e.latlng, {
          radius: sizeInKm * 1000,
          color: randomHexColor(),
          opacity: 6,
        }).addTo(map);

        // let radius be toggled on/off
        circle.addTo(radii);

        // create marker at click location
        var marker = L.marker(e.latlng, {
          myCustomId: "randomHexColor",
        }).addTo(map);
        marker.bindTooltip(combinedInfo).openTooltip();

        // let transmitter markers be toggled on/off
        marker.addTo(xmtrs);

      });