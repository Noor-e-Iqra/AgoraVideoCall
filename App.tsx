/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */
import React, {useEffect, useState} from 'react';
import DeviceInfo from 'react-native-device-info';
import VideoCallScreen from './src/screens/VideoCall';
import {BASE_URL} from './src/utils/config';

function App(): React.JSX.Element {
  const [user, setUser] = useState({});

  const fetchToken = async () => {
    try {
      const id = await DeviceInfo.getUniqueId();
      const name = await DeviceInfo.getDeviceName();
      const response = await fetch(`${BASE_URL}/generateToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: id,
          deviceName: name,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser({token: data.token, name: name});
      } else {
        console.error('Failed to generate token:', response.statusText);
      }
    } catch (error) {
      console.error('Error during token generation:', error);
    }
  };

  useEffect(() => {
    fetchToken();
  }, []);

  return Object.keys(user).length ? <VideoCallScreen user={user} /> : <></>;
}

export default App;
