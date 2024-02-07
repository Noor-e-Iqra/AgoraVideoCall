/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import AgoraUIKit from 'agora-rn-uikit';
import React, {useEffect, useState} from 'react';
import {SafeAreaView, Dimensions, StyleSheet, Text, View} from 'react-native';
import RtcEngine, {ClientRole} from 'react-native-agora';
import {io} from 'socket.io-client';
import {BASE_URL} from '../utils/config';
const {width} = Dimensions.get('window');

const connectionData = {
  appId: 'f45d88ba62e0409ea4b7f4786043ddca',
  channel: 'test',
};

const VideoCallScreen = ({user}) => {
  const rtcEngine = new RtcEngine();
  const [role, setRole] = useState(ClientRole.Audience);
  const [notification, setNotification] = useState(null);
  const [timer, setTimer] = useState(120);
  const [socket, setSocket] = useState();
  const rtcCallbacks = {
    EndCall: () => {
      socket.disconnect();
      if (role === ClientRole.Broadcaster) rtcEngine.destroy();
      else rtcEngine.leaveChannel();
    },
  };
  useEffect(() => {
    const socketInstance = io(BASE_URL, {
      auth: {token: user.token},
    });

    socketInstance.on('connect', () => {
      console.log('Connected to WebSocket');
    });
    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  useEffect(() => {
    //  handle initial role when receiving a WebSocket event
    const initial = socket?.on('initialRole', newRole => {
      updateRole(newRole);
    });

    //  switch role when receiving a WebSocket event
    const switchRole = socket?.on('switchRole', newRole => {
      updateRole(newRole);
    });

    //  handle notifications when receiving a WebSocket event
    const notiListener = socket?.on('notification', data => {
      if (role === ClientRole.Broadcaster) {
        setTimer(10);
        startTimer();
        setNotification('Your Performance will end in');
      } else setNotification(data);
    });

    return () => {
      socket?.offAny(initial);
      socket?.offAny(switchRole);
      socket?.offAny(notiListener);
    };
  }, [socket, role]);

  const formatTime = seconds => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(
      remainingSeconds,
    ).padStart(2, '0')}`;
  };

  function updateRole(newRole) {
    setTimer(120);
    startTimer();
    setNotification(null);
    if (newRole === 'performer') setRole(ClientRole.Broadcaster);
    else setRole(ClientRole.Audience);
  }

  function startTimer() {
    const intervalId = setInterval(() => {
      setTimer(prevTimer => {
        const newTimer = prevTimer > 0 ? prevTimer - 1 : 0;
        if (newTimer === 0) {
          clearInterval(intervalId);
          setNotification(null);
        }
        return newTimer;
      });
    }, 1000);
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: 'black'}}>
      <AgoraUIKit
        connectionData={connectionData}
        rtcCallbacks={rtcCallbacks}
        settings={{role: role, layout: 0}}
      />
      <View
        style={{
          padding: 20,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'absolute',
          left: 0,
          right: 0,
          marginTop: '20%',
        }}>
        <Text
          style={{
            fontSize: 20,
            color: 'white',
          }}>
          {user.name}
        </Text>
        {/* {role === ClientRole.Broadcaster && (
          <Text
            style={{
              fontSize: 16,
              color: 'white',
            }}>
            {formatTime(timer)}
          </Text>
        )} */}
      </View>
      {notification && (
        <View
          style={{
            padding: 20,
            position: 'absolute',
            right: 0,
            borderRadius: 10,
            bottom: '20%',
            backgroundColor: 'white',
          }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: 'black',
            }}>
            {role === ClientRole.Broadcaster
              ? `${notification} ${timer} seconds`
              : notification}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  localBtn: {
    height: 50,
    width: 50,
    borderRadius: 30,
    borderWidth: 2,
    backgroundColor: 'red',
  },
});

export default VideoCallScreen;
