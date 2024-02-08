/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import AgoraUIKit from 'agora-rn-uikit';
import React, {useEffect, useState} from 'react';
import {SafeAreaView, StyleSheet, Text, View} from 'react-native';
import RtcEngine, {ClientRole} from 'react-native-agora';
import {io} from 'socket.io-client';
import {AGORA_ID, BASE_URL} from '../utils/config';

const connectionData = {
  appId: AGORA_ID,
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

    //  clear notification on all devices when receiving a WebSocket event
    const clearNotiListener = socket?.on('clearNotification', () => {
      setNotification(null);
    });

    return () => {
      socket?.offAny(initial);
      socket?.offAny(switchRole);
      socket?.offAny(notiListener);
      socket?.offAny(clearNotiListener);
    };
  }, [socket, role]);

  function updateRole(newRole) {
    setTimer(120);
    startTimer();
    if (newRole === 'performer') setRole(ClientRole.Broadcaster);
    else setRole(ClientRole.Audience);
  }

  function startTimer() {
    const intervalId = setInterval(() => {
      setTimer(prevTimer => {
        const newTimer = prevTimer > 0 ? prevTimer - 1 : 0;
        if (newTimer === 0) {
          clearInterval(intervalId);
        }
        return newTimer;
      });
    }, 1200);
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: 'black'}}>
      {/* video call ui */}
      <AgoraUIKit
        connectionData={connectionData}
        rtcCallbacks={rtcCallbacks}
        settings={{role: role, layout: 0}}
      />
      {/* device name */}
      <View style={styles.top_container}>
        <Text style={styles.name}>{user.name}</Text>
        {/* role */}
        <Text style={styles.role}>
          {role === ClientRole.Broadcaster ? 'Performer' : 'Audience'}
        </Text>
      </View>
      {/* notification */}
      {notification && (
        <View style={styles.bottom_container}>
          <Text style={styles.noti}>
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
  top_container: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    marginTop: '20%',
  },
  name: {
    fontSize: 20,
    color: 'white',
  },
  role: {
    fontSize: 18,
    color: 'white',
  },
  bottom_container: {
    padding: 20,
    position: 'absolute',
    right: 0,
    borderRadius: 10,
    bottom: '20%',
    backgroundColor: 'white',
  },
  noti: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
  },
});

export default VideoCallScreen;
