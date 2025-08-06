import React, { useState, useEffect, useContext, useRef } from "react";
// import { AuthContext } from "../../AuthContext";

import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import axios from "axios";
// import ArgonBox from "components/ArgonBox";
// import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
// import DashboardNavbar from "examples/Navbars/DashboardNavbar";
// import Footer from "examples/Footer";
import MapWithDraw from "../../components/drawAOI/MapWithDraw";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { MapContainer, TileLayer, useMap, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import EditGeofences from '../../components/drawAOI/EditGeofences';
import MapWithFullscreen from '../../components/drawAOI/MapWithFullscreen';
import Autocomplete from "@mui/material/Autocomplete";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import { Button, Box,ListItemText } from "@mui/material";
// import MeasureControl from '../../components/drawAOI/MeasureControl';
// import FlyToPort from "../../components/drawAOI/FlyToPort";
// import MapWithMarkers from '../../components/drawAOI/MapWithMarkers';
// import GeofenceMessage from '../../components/drawAOI/GeofenceMessage';
// import GeofenceHistories from "../../components/drawAOI/GeofenceHistories";
// import MapWithCircleGeofences from "../../components/drawAOI/MapWithCircleGeofences";
// import GeofenceDetails from "../../components/drawAOI/GeofenceDetails.js";
import Swal from 'sweetalert2';

import * as turf from '@turf/turf';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point, polygon, lineString } from '@turf/turf';
import 'leaflet.markercluster';
import { FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import '../../components/drawAOI/MyMapComponent.css'; 
import {   LayersControl } from 'react-leaflet';




import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'leaflet';
import 'leaflet-draw';
import 'leaflet-fullscreen';
import L from 'leaflet';  // before using new L.Icon
import './drawAOI.css'; // Custom styles for the map

const { BaseLayer } = LayersControl;
import UpdateApiKeyModal from '../../components/UpdateApiKeyModal';

// import SearchControl from '../../components/drawAOI/SearchControl';

import { createTheme, ThemeProvider } from "@mui/material/styles";

// Custom icon for port markers
const portIcon = new L.Icon({
  iconUrl: "/anchor-icon.png ", // Example ship icon
  //  https://cdn-icons-png.flaticon.com/512/684/684908.png
  iconSize: [15, 15],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});



const DrawAOI = () => {
  const [marineAPIKEY, setMarineAPIKEY] = useState("");
const [isApiKeyModalOpen, setApiKeyModalOpen] = useState(false);

  
  const mapRef = useRef(null);
  const drawnItemsRef = useRef(null);

  const [planetTileUrl, setPlanetTileUrl] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const APIKEY = import.meta.env.VITE_PLANET_KEY;

  
  const [polygonGeoJSON, setPolygonGeoJSON] = useState(null);

  
  const getAoiBounds = (geojson) => {
    const feature = geojson.features[0];
    const coords = feature.geometry.coordinates;
    const flatCoords = feature.geometry.type === 'Polygon' ? coords[0] : coords[0][0];
    return flatCoords.map(([lng, lat]) => [lat, lng]);
  };

const fetchScenes = async () => {

  setPlanetTileUrl(null);
  // setDetectionResults({ polygons: [], points: [] });
  


  // Step 1: Find AOI polygon by selected place
  // const selectedAOI = AOIPolygons.find(p => p.place === selectedPlace);

  if (!polygonGeoJSON || !polygonGeoJSON.features || polygonGeoJSON.features.length === 0) {
    Swal.fire('Error', 'No AOI polygon found for selected place.', 'error');
    return;
  }

    Swal.fire({
    title: 'Loading Planet imagery…',
    // html: 'Using Planet API to retrieve satellite tile',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  const selectedFeature = polygonGeoJSON.features[0];
  const coordinates = selectedFeature.geometry.coordinates;

const searchBody = {
  "item_types": ["PSScene"],
  "filter": {
    "type": "AndFilter",
    "config": [
      {
        "type": "GeometryFilter",
        "field_name": "geometry",
        "config": {
          "type": "Polygon",
          "coordinates": coordinates
        }
      },
      {
        "type": "DateRangeFilter",
        "field_name": "acquired",
        "config": {
          // "gte": `${selectedDate}T00:00:00Z`,
          // "lte": `${selectedDate}T23:59:59Z`
          "gte": `${dayjs(selectedDate).format("YYYY-MM-DD")}T00:00:00Z`,
          "lte": `${dayjs(selectedDate).format("YYYY-MM-DD")}T23:59:59Z`
        }
      },
      {
        "type": "RangeFilter",
        "field_name": "cloud_cover",
        "config": {
          "lte": 0.1
        }
      }
    ]
  }
}


  try {
    // Call Planet API
const res = await fetch('https://api.planet.com/data/v1/quick-search', {
  method: 'POST',
  headers: {
    Authorization: `Basic ${btoa(APIKEY + ':')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(searchBody)
});
 const text = await res.text();
    console.error('Planet response status:', res.status, 'body:', text);
    const data = JSON.parse(text);

    if (!data.features?.length) {
      // setAnalysisVessels([]);
      // setAnalysisStats({
      // vesselsInsidePolygons: [],
      // redPolygonCount: 0,
      // vesselsOutsideCount: 0,
      // });
      Swal.close();
      Swal.fire('No imagery', 'No valid scenes found. Try another date or AOI.', 'warning');
      return;
    }

    const sceneId = data.features[0].id;
    const tileUrl = `https://tiles{s}.planet.com/data/v1/PSScene/${sceneId}/{z}/{x}/{y}.png?api_key=${APIKEY}`;
    setPlanetTileUrl(tileUrl);
      setTimeout(() => {
      mapRef.current?.flyToBounds(getAoiBounds(polygonGeoJSON), { padding: [20,20], duration: 1.5 });
    }, 500);

    // 2. Update modal to finished imagery
    Swal.fire({
      title: 'Imagery loaded!',
      html: `Scene ID: <strong>${sceneId}</strong>`,
    });

//       // Then show loading for vessel detection
// await Swal.fire({
//   title: 'Analyzing detection…',
//   html: 'Identifying vessel polygons…',
//   allowOutsideClick: false,
//   showConfirmButton: false,
//   didOpen: () => Swal.showLoading(),
// });

//     const resp = await axios.post(`${baseURL}/api/detect-vessels-nodejs`, {
//       place: selectedPlace,
//       date: selectedDate,
//       geometry: selectedAOI.features[0].geometry.coordinates
//     });
//     // console.log('Detection response:', resp.data);
//     setDetectionResults({
//       polygons: resp.data.detected_polygons,
//       points: resp.data.detected_points,
//     });

// await new Promise(r => setTimeout(r, 50));
// if (Swal.isVisible()) {
//   Swal.getPopup()?.style.setProperty('animation-duration', '0ms');
//   Swal.close();
// }
// await Swal.fire('Detection complete!', '', 'success');

  } catch (error) {
    console.error('Scene fetch failed:', error);
    Swal.fire('Error', 'Failed to load imagery.', 'error');
  }
};




  const [geofences, setGeofences] = useState([]);
  const [filteredGeofences, setFilteredGeofences] = useState([]);
    const [polygonGeofences, setPolygonGeofences] = useState([]);
    const [polylineGeofences, setPolylineGeofences] = useState([]);
    const [circleGeofences, setCircleGeofences] = useState([]);
    const [terrestrialGeofences, setTerrestrialGeofences] = useState([]);
    const [breakwatersLineGeofences, setBreakwatersLineGeofences] = useState([]);

  const [vesselBufferGeofences, setVesselBufferGeofences] = useState([]);

  const [vesselHistory, setVesselHistory] = useState([]);


  const [mapCenter, setMapCenter] = useState([0, 0]);
  const [selectedGeofence, setSelectedGeofence] = useState(null);
  const [editingMode, setEditingMode] = useState(false); // Manage editing mode
  const [geofenceNames, setGeofenceNames] = useState([]);
  const [ports, setPorts] = useState([]); // Store ports data
  const [portnames, setPortnames] = useState([]); // Store ports data

  const [selectedPort, setSelectedPort] = useState(null);
  const [geofenceTypes, setGeofenceTypes] = useState([]);
  const [selectedGeofenceType, setSelectedGeofenceType] = useState("");



    const [vessels, setVessels] = useState([]);
    const [selectedVessel, setSelectedVessel] = useState(null);
    const [vesselEntries, setVesselEntries] = useState({});
    const [notifications, setNotifications] = useState([]);
    // const { role, id } = useContext(AuthContext);
    const [loading, setLoading]=useState(false);
    const [error, setError ]=useState("");
    const [vesselTableData, setVesselTableData] = useState([]);
  
    const [geofenceUpdateTrigger, setGeofenceUpdateTrigger] = useState(0);

const handleGeofenceChange = () => {
  setGeofenceUpdateTrigger(prev => prev + 1); // Increment to trigger useEffect
};


  const fetchGeofences = async () => {
    try {
      const baseURL = import.meta.env.REACT_APP_API_BASE_URL;
  
      const responses = await Promise.allSettled([
        axios.get(`${baseURL}/api/polygonTerrestrialGeofences-2`),
        axios.get(`${baseURL}/api/polygongeofences`),
        axios.get(`${baseURL}/api/polylinegeofences`),
        axios.get(`${baseURL}/api/circlegeofences`),
        axios.get(`${baseURL}/api/get-vessel-buffer-geofences`)
       
      ]);
  
      const [terrestrialGeofenceResponse ,polygonResponse, polylineResponse, circleResponse, vesselBufferResponse  ] = responses.map(res =>
        res.status === "fulfilled" ? res.value.data : []
      );
  
      const allGeofences = [...terrestrialGeofenceResponse, ...polygonResponse, ...polylineResponse, ...circleResponse, ...vesselBufferResponse ];
  
      setGeofences(allGeofences);
      setFilteredGeofences(allGeofences);



    setPolygonGeofences(polygonResponse);
    setPolylineGeofences(polylineResponse);
    setCircleGeofences(circleResponse);
    setTerrestrialGeofences(terrestrialGeofenceResponse);
    setVesselBufferGeofences(vesselBufferResponse);
    
    
    const filteredBreakWatersLineGfs = polylineResponse.filter(item => item.geofenceType === "breakwaters");
    //  console.log(filteredTerrestrialData);
    setBreakwatersLineGeofences(filteredBreakWatersLineGfs);
   

  
      // Extract unique geofence types
      const uniqueTypes = [...new Set(allGeofences.map(g => g.type))];
      setGeofenceTypes(uniqueTypes);


  
      // // Set map center to first valid geofence
      // const firstValidGeofence = allGeofences.find(
      //   (geofence) =>
      //     geofence.coordinates &&
      //     geofence.coordinates[0] &&
      //     !isNaN(geofence.coordinates[0].lat) &&
      //     !isNaN(geofence.coordinates[0].lng)
      // );
  
      // if (firstValidGeofence) {
      //   setMapCenter([firstValidGeofence.coordinates[0].lng, firstValidGeofence.coordinates[0].lat]);
      // }
    } catch (error) {
      console.error("Error fetching geofences:", error);
    }
  };





  const calculateMapCenter = () => {
    if (vessels.length === 0) return [0, 0];
    const latSum = vessels.reduce((sum, vessel) => sum + vessel.lat, 0);
    const lngSum = vessels.reduce((sum, vessel) => sum + vessel.lng, 0);
    return [latSum / vessels.length, lngSum / vessels.length];
  };

    
   // Helper function to fetch tracked vessels by user
  const fetchTrackedVesselsByUser = async (userId) => {
    try {
      const baseURL = process.env.REACT_APP_API_BASE_URL;
      const response = await axios.get(`${baseURL}/api/get-vessel-tracked-by-user`);
      // console.log(response);
      return response.data.filter(vessel => vessel.loginUserId === userId);
     
      
    } catch (error) {
      console.error("Error fetching tracked vessels by user:", error);
      return [];
    }
  };
  
  
  // new start
  
  const fetchVesselIMOValues = async (userId) => {
    try {
      // Extract orgId from userId
      let OrgId = userId.includes('_') ? userId.split('_')[1] : userId.split('_')[0];
      
      // Define the base URL for the API
      const baseURL = process.env.REACT_APP_API_BASE_URL;
  
      // Fetch only the relevant vessels from the server based on orgId
      const response = await axios.get(`${baseURL}/api/get-vessel-tracked-by-user-based-on-OrgId`, {
        params: {
          OrgId: OrgId
        }
      });
  
     
  
    
      const vesselsFiltered = response.data;
  
   
      
      return vesselsFiltered;
    } catch (error) {
      console.error("Error fetching IMO values:", error);
      return [];
    }
  };
  
  
  
  // new end
  
  const fetchVesselById = async (userId) => {
    try {
    
      
      // Define the base URL for the API
      const baseURL = process.env.REACT_APP_API_BASE_URL;
  
      // Fetch only the relevant vessels from the server based on orgId
      const response = await axios.get(`${baseURL}/api/get-vessel-tracked-by-user-based-on-loginUserId`, {
        params: {
          loginUserId : userId
        }
      });
  
     
  
      // Extract IMO values from the response
      const vesselsFiltered = response.data;
  
   
      
      return vesselsFiltered;
    } catch (error) {
      console.error("Error fetching vessels values:", error);
      return [];
    }
  };

  
  // const fetchVessels = async (role, userId) => {
  //   try {
  //     // Fetch the tracked vessels for the user first
  //     const trackedByUser = await fetchTrackedVesselsByUser(userId);
  //     // console.log(trackedByUser);
  
  //     // Ensure tracked vessels have a valid IMO and extract them
  //     const trackedIMO = trackedByUser.filter(vessel => vessel.IMO).map(vessel => vessel.IMO);
  
  //     const baseURL = process.env.REACT_APP_API_BASE_URL;
  //     // Now fetch all vessels
     
  //     const response = await axios.get(`${baseURL}/api/get-tracked-vessels`);
      
  //     const allVessels = response.data;
      
  //    // Initialize an empty array to store the filtered vessels
  //     const filteredVessels = [];
  
  
  //       if (role === 'hyla admin') {
  //         // For 'hyla admin', return all vessels whose IMO is in the tracked IMO list
  //         filteredVessels.push(...allVessels); // Spread allVessels into filteredVessels to avoid nested array
  //       } else if (role === 'organization admin' || role === 'organizational user') {
        
  
  //         // Now, you need to fetch the IMO values for the user
  //         const vesselsFiltered = await fetchVesselIMOValues(userId); // Await this async function
  
  //         // Check if the vessel IMO is in the fetched IMO values
  //         filteredVessels.push(...vesselsFiltered); // to avoid array inside array nested
         
          
  //       } else if (role === 'guest') {
  //         // For 'guest', filter vessels based on loginUserId
       
  
  //             // Now, you need to fetch the IMO values for the user
  //             const vesselsFiltered = await fetchVesselById(userId); // Await this async function
  //             filteredVessels.push(...vesselsFiltered); // to avoid array inside array nested
  //       }else{
  //         console.log('not found')
  //       }
      
      
  
    
  
  //     // console.log('Filtered Vessels:', finalVessels);
  //     return filteredVessels;
  
  //   } catch (error) {
  //     console.error("Error fetching vessels:", error);
  //     return [];
  //   }
  // };
  

  // useEffect(() => {
  //   const baseURL = process.env.REACT_APP_API_BASE_URL;
    
  
  //   fetchVessels(role, id)
  //     .then(filteredVessels => {
  //       // Process filtered data
  // // console.log(filteredVessels);
  //       const transformedData = filteredVessels.map((vessel) => ({
  //         SpireTransportType: vessel.SpireTransportType|| '',
  //         name: vessel.AIS?.NAME || "-",
  //         timestamp: vessel.AIS?.TIMESTAMP || "-",
  //         imo: vessel.AIS?.IMO || 0,
  //         speed: vessel.AIS?.SPEED || 0,
  //         lat: vessel.AIS?.LATITUDE || 0,
  //         lng: vessel.AIS?.LONGITUDE || 0,
  //         heading: vessel.AIS?.HEADING || 0,
  //         status: vessel.AIS?.NAVSTAT || 0,
  //         eta: vessel.AIS?.ETA || 0,
  //         destination: vessel.AIS?.DESTINATION || '',
  //         zone: vessel.AIS?.ZONE || '',
  //       }));
  //       // console.log(transformedData);
  
  
  //       setVessels(transformedData);
     

  //     })
  //     .catch((err) => {
  //       console.error("Error fetching vessel data:", err);
  //       // setError(err.message);
  //     })
      
  // }, [role,id]);
  

useEffect(() => {
  const fetchApiKey = async () => {
    try {
      const base = import.meta.env.VITE_API_BASE_URL;
      const resp = await axios.get(`${base}/api/maritime-api-key/planet`);
      setMarineAPIKEY(resp.data.key);
    } catch (e) {
      console.log("No API key found:", e.response?.data?.detail);
    }
  };
  fetchApiKey();
}, []);

const marineKeyRef = useRef("");

useEffect(() => {
  marineKeyRef.current = marineAPIKEY;
}, [marineAPIKEY]);

const handleApiKeyUpdate = () => {
  setApiKeyModalOpen(true);
};
const saveNewApiKey = async (newKey) => {
  if (!newKey || newKey === marineAPIKEY) return;

  try {
    const baseURL = import.meta.env.VITE_API_BASE_URL;
    await axios.post(`${baseURL}/api/update-maritime-api-key`, {
      key: newKey,
      source: "planet",
    });
    toast.success("API Key updated successfully");
    setMarineAPIKEY(newKey);
    setPlanetTileUrl(null);
  } catch {
    toast.error("Error updating API Key");
  }
};


  return (
     <div>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      {/* <DashboardNavbar vesselEntries={vesselEntries} /> */}
      {/* <ArgonBox py={3}> */}

 
             <UpdateApiKeyModal
  open={isApiKeyModalOpen}
  onClose={() => setApiKeyModalOpen(false)}
  currentKey={marineAPIKEY}
  onSave={saveNewApiKey}
/>

          
          
{/* <Grid container py={1} mt={0}>
    <Grid item xs={12} style={{borderRadius: "10px"}}>
      <Card
      sx={{
        backgroundColor: "white",
        borderRadius: "15px",
        boxShadow: 1,
        padding: "10px", // Ensure no padding
        margin: "0px", // Ensure no margin
        display: "flex", // Helps remove unwanted gaps
        flexDirection: "column",
      }}
    >
      <CardContent
        sx={{
          backgroundColor: "white",
          padding: "0px !important", // Force override default padding
          margin: "0px",
          "&:last-child": { padding: "0px" }, // Ensures last-child padding is removed
        }}
      > */}

                {/* <MapContainer center={[0, 0]}  zoom={2} 
                style={{ height: '760px' , borderRadius: "15px" ,  boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}
                   > */}
              {/* <div style={{ position: "relative", height: "720px", width: "100%" }}> */}
      
              {/* <div style={{ position: "relative", width: "100%", height: "81%", }}> */}
                    {/* ✅ Vessel + Address Search Bar */}

{/* Always-visible API key button */}
<Box my={2} display="flex" justifyContent="flex-end">
  <Button
    variant="outlined"
    sx={{ fontSize: '0.85rem', textTransform: 'none', height: '36px' }}
    onClick={handleApiKeyUpdate}
  >
    Add / Update API Key
  </Button>
</Box>


{polygonGeoJSON && (
      <Box
        my={2} // ⬅️ Adds vertical margin
        display="flex"
        alignItems="center"
        justifyContent="center"
        gap="1rem"
        padding="0.7rem 1rem"
        bgcolor="#f9f9f9"
        border="1px solid #ddd"
        borderRadius="8px"
        boxShadow="0 2px 6px rgba(0,0,0,0.08)"
        flexWrap="wrap"
        margin="0.2rem auto"
        width="fit-content"
        maxWidth="100%"
      >
    <Box display="flex" alignItems="center">
      <Typography sx={{ fontWeight: 'bold', fontSize: '0.95rem', mr: 1 }}>
        Select Date:
      </Typography>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          value={selectedDate}
          onChange={(newValue) => setSelectedDate(newValue)}
          slotProps={{
            textField: {
              size: 'small',
              variant: 'outlined',
              sx: {
                fontSize: '0.9rem',
                minWidth: 180,
                '& .MuiInputBase-root': {
                  paddingRight: '10px',
                }
              }
            }
          }}
        />
      </LocalizationProvider>
    </Box>

    <Button
      variant="contained"
      onClick={fetchScenes}
      disabled={!selectedDate}
      sx={{
        padding: '0.5rem 0.8rem',
        fontSize: '0.95rem',
        backgroundColor: selectedDate ? '#007bff' : '#ccc',
        color: '#fff',
        borderRadius: '4px',
        textTransform: 'none',
        boxShadow: 'none',
        '&:hover': {
          backgroundColor: selectedDate ? '#0069d9' : '#ccc',
        },
        cursor: selectedDate ? 'pointer' : 'not-allowed'
      }}
    >
      Load Imagery
    </Button>
  </Box>
)}



                  {/* <MapContainer id="map"  center={[0, 0]} minZoom={2.8} zoom={2.8} maxZoom={18}  whenCreated={(mapInstance) => (mapRef.current = mapInstance)}
      
                                maxBounds={[[95, -180], [-95, 180]]}
                                maxBoundsViscosity={1.0}
                                worldCopyJump={true} // ⬅️ Fixes blank area when zooming out
                                style={{
                                  height: "75vh",
                                  width: "100%",
                                  marginTop: "7px",
                                  borderRadius: "17px",
                                  backgroundSize: "contain", // ✅ Placed correctly
                                  backgroundRepeat: "no-repeat", // ✅ Placed correctly
                                }}       
                                > */}
{/* <div style={{ height: '70vh', width: '100%' }}> */}
              <Box
  sx={{
    height: '80vh',
    width: '100%',
    borderRadius: '18px',
    overflow: 'hidden', // ✅ Important to clip the rounded corners
    backgroundColor: '#f1f1f1', // ✅ Fallback background for loading tiles
    boxShadow: '0 4px 18px rgba(0,0,0,0.12)', // ✅ Subtle elevation
  }}
>
                                      <MapContainer
      whenCreated={(mapInstance) => {
        mapRef.current = mapInstance;
        console.log("Map created:", mapInstance); // DEBUG
      }}
      center={[0, 0]}
      // zoom={3}
      minZoom={1.5}
      zoom={1.5}
      maxZoom={18}
      maxBounds={[[85, -180], [-85, 180]]}
      maxBoundsViscosity={8}
      style={{ height: '100%', width: '100%' }}
      >

                                   <TileLayer
                                    url="https://tiles.planet.com/basemaps/v1/planet-tiles/global_monthly_2025_02_mosaic/gmap/{z}/{x}/{y}.png?api_key=PLAK09a935f52aef40f6960cf51bbfd959db"
                                    attribution="&copy; <a href='https://www.planet.com'>Planet Labs</a>"
                                    noWrap={true}
                                  />

                                    {planetTileUrl && (
                                    <TileLayer
                                      key={planetTileUrl}
                                      url={planetTileUrl}
                                      subdomains={['0', '1', '2', '3']}
                                      attribution="&copy; <a href='https://www.planet.com'>Planet Labs</a>"
                                      noWrap
                                      zIndex={1000} 
                                    />
                                  )} 
                                  
                  {/* <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /> */}
                   {/* <LayersControl position="topright">
                  
                      
                         <LayersControl.BaseLayer name="Mapbox Satellite">
                      <TileLayer
                        url="https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoidmlydTEyMjEiLCJhIjoiY2xpZnNnMW96MG5wdDNxcGRrZm16MHpmNyJ9.6s-u4RK92AQRxLZu2F4Rzw"
                        noWrap={true}
                      />
                      </LayersControl.BaseLayer>
                
                    
               
                       <LayersControl.BaseLayer checked name="OpenStreetMap">
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        noWrap={true}
                      />
                          </LayersControl.BaseLayer>
                
                   
                
                  </LayersControl> */}
                  {/* <SearchControl vessels={vessels} /> */}
                

                  <MapWithFullscreen />
                  {/* <MapWithCircleGeofences geofences={vesselBufferGeofences} /> */}
                  {/* <MapWithMarkers vessels={vessels} selectedVessel={selectedVessel} /> */}

                  {/* <EditGeofences
                    geofences={filteredGeofences}
                    selectedGeofence={selectedGeofence}
                    setSelectedGeofence={setSelectedGeofence}
                    setGeofences={setGeofences}
                    setFilteredGeofences={setFilteredGeofences}
                    handleGeofenceChange={handleGeofenceChange} 

                  /> */}
                  {/* <MeasureControl /> */}
                  {/* <MapWithDraw 
                    vessels={vessels}
                    portnames={portnames} 
                    setGeofences={setGeofences} 
                    setFilteredGeofences={setFilteredGeofences}
                    handleGeofenceChange={handleGeofenceChange} 
                    map={mapRef.current}  
                  /> */}

           <FeatureGroup ref={drawnItemsRef}>
  <EditControl
    position="topright"
    onCreated={(e) => {
      const layerContainer = drawnItemsRef.current;
      if (layerContainer) {
        layerContainer.clearLayers();
        layerContainer.addLayer(e.layer);
      }

      const geojson = e.layer.toGeoJSON();
      const featureCollection = {
        type: "FeatureCollection",
        features: [geojson],
      };
      setPolygonGeoJSON(featureCollection);
      console.log("Drawn Polygon:", featureCollection);

      // ✅ Fly to the bounds of the new polygon
      const bounds = e.layer.getBounds();
      if (mapRef.current && bounds) {
        mapRef.current.flyToBounds(bounds, {
          padding: [20, 20],
          duration: 1.2, // seconds
        });
      }
    }}

 draw={{
        rectangle: false,
        circle: false,
        marker: false,
        polyline: false,
        circlemarker: false,
        polygon: {
          allowIntersection: true,
          showArea: true,
          repeatMode: true,
          shapeOptions: { color: 'red' }
        }
      }}
  />
</FeatureGroup>




                </MapContainer>
              </Box>  
                {/* </div>
                </div>
               
                </CardContent>
      </Card> */}
    {/* </Grid>
</Grid> */}

        
       
      {/* </ArgonBox> */}
      {/* <Footer /> */}
    </div>
  );
};

export {DrawAOI};
