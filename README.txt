Flight aviation

The applicacion is serverless. All the required data is loaded with javascript files. All the application is in the page "index.html".


index.html
    Dashboard with several diagrams for the visualizations of the flights.

js/main.js
    All the javascript logic of the page.

lib/
    Libraries that I used for the graphs:
        - d3.js
        - vis
        - chart.js
        - google maps

convert_excel_to_js.py
    Little script to convert "Exported FlightLegs From 2017-07-24 To 2017-07-30[1].xlsx" file to a javascript file

