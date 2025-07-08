import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Button, TouchableOpacity, Modal } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { PermissionsAndroid } from 'react-native';
import { Magnetometer } from 'expo-sensors';

const DeviceScan = () => {
  const bleManager = new BleManager();
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState([]);
  const [heading, setHeading] = useState(0);
  const [selectedDevice, setSelectedDevice] = useState(null);

  const requestPermissions = async () => {
    try {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
    } catch (err) {
      console.warn(err);
    }
  };

  useEffect(() => {
    requestPermissions();

    const magnetometerSubscription = Magnetometer.addListener((data) => {
      const angleInRadians = Math.atan2(data.y, data.x);
      let angleInDegrees = (angleInRadians * 180) / Math.PI;
      angleInDegrees = (angleInDegrees + 360) % 360;
      setHeading(angleInDegrees);
    });

    return () => {
      if (scanning) {
        bleManager.stopDeviceScan();
      }
      magnetometerSubscription.remove();
    };
  }, [scanning]);

  useEffect(() => {
    // Set interval để cập nhật vị trí thiết bị và tính toán lại liên tục
    const interval = setInterval(() => {
      if (scanning) {
        setDevices((prevDevices) => {
          return prevDevices.map((device) => {
            const newDistance = calculateDistance(device.rssi);
            const newDevice = { ...device, distance: newDistance };
            return newDevice;
          });
        });
      }
    }, 3000); // Cập nhật mỗi giây (1s)

    return () => clearInterval(interval);
  }, [scanning, devices]);

  const startScan = () => {
    if (!scanning) {
      setScanning(true);
      setDevices([]);
      bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.log('Scan error:', error);
          return;
        }
        if (device && device.name) {
          setDevices((prevDevices) => {
            return prevDevices.some((d) => d.id === device.id) ? prevDevices : [...prevDevices, device];
          });
        }
      });
    }
  };

  const stopScan = () => {
    setScanning(false);
    bleManager.stopDeviceScan();
  };

  const calculateDistance = (rssi) => {
    if (rssi === null) return 0;
    const txPower = -59; // Giá trị được giả định cho công suất tín hiệu ở khoảng cách 1m
    return Math.max(Math.pow(10, (txPower - rssi) / (10 * 2)), 0.5); // Tính toán khoảng cách
  };

  const calculateAngleFromId = (id) => {
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return hash % 90;  // Tính toán góc dựa trên id thiết bị
  };

  const renderDevicesAroundYou = () => {
    const circleRadius = 140; // Bán kính vòng tròn nơi các thiết bị sẽ được hiển thị
    const centerX = circleRadius;
    const centerY = circleRadius;
  
    const positions = []; // Lưu trữ vị trí các thiết bị để kiểm tra chồng lấn
  
    return (
      <View style={[styles.circleContainer, { width: 2 * circleRadius, height: 2 * circleRadius }]}>
        {devices.map((device, index) => {
          const distance = calculateDistance(device.rssi);
          const deviceAngle = calculateAngleFromId(device.id);
  
          // Tính bán kính thiết bị với tỷ lệ khoảng cách, đảm bảo bán kính không vượt quá bán kính vòng tròn
          const radius = Math.min(distance / 10 * circleRadius, circleRadius);
  
          // Tính tọa độ ban đầu
          let x = centerX + radius * Math.sin(((deviceAngle - heading) * Math.PI) / 180);
          let y = centerY - radius * Math.cos(((deviceAngle - heading) * Math.PI) / 180);
  
          // Phát hiện và xử lý chồng lấn
          const isOverlapping = positions.some(([px, py]) => {
            const dx = x - px;
            const dy = y - py;
            return Math.sqrt(dx * dx + dy * dy) < 40; // Khoảng cách tối thiểu để không bị chồng lấn
          });
  
          if (isOverlapping) {
            x += Math.random() * 20 - 10;
            y += Math.random() * 20 - 10;
          }

          positions.push([x, y]);
  
          return (
            <TouchableOpacity
              key={index}
              style={[styles.deviceMarker, { left: x - 20, top: y - 20 }]}
              onPress={() => setSelectedDevice(device)}
            >
              <Text style={styles.deviceName}>{device.name}</Text>
              <Text style={styles.deviceDistance}>{distance.toFixed(2)} m</Text>
              <Text style={styles.deviceHeading}>{deviceAngle.toFixed(2)}°</Text>
            </TouchableOpacity>
          );
        })}
        <View style={styles.centerMarker}>
          <Text style={styles.centerText}>You</Text>
        </View>
      </View>
    );
  };
  

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Device Scan</Text>
      <Button 
        onPress={scanning ? stopScan : startScan} 
        title={scanning ? 'Stop Scanning' : 'Start Scanning'}
      />
      {renderDevicesAroundYou()}

      <Modal
        visible={selectedDevice !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedDevice(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedDevice?.name}</Text>
            <Text>Distance: {calculateDistance(selectedDevice?.rssi).toFixed(2)} m</Text>
            <Text>RSSI: {selectedDevice?.rssi}</Text>
            <Button title="Close" onPress={() => setSelectedDevice(null)} />
          </View>
        </View>
      </Modal>

      <View style={styles.headingContainer}>
        <Text style={styles.headingText}>Heading: {heading.toFixed(2)}°</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  circleContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 150,
    borderWidth: 2,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  centerMarker: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  centerText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  deviceMarker: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff9800',
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  deviceName: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  deviceDistance: {
    fontSize: 10,
    color: '#fff',
    textAlign: 'center',
  },
  deviceHeading: {
    fontSize: 8,
    color: '#fff',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: 250,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  headingContainer: {
    marginTop: 20,
  },
  headingText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DeviceScan;
