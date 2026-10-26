from machine import ADC, Pin, time_pulse_us, SoftI2C, UART
import time
import dht 

#Sen0121
#Sensor de lluvia
#Funciona midiendo las alteracion de voltaje en su placa principal
class SensorLluvia:
    def __init__(self, pin_adc):
        self.adc = ADC(Pin(pin_adc))
        self.adc.atten(ADC.ATTN_11DB) #Rango de voltaje hasta 3.3  
        self.adc.width(ADC.WIDTH_12BIT) #12bits = valores entre 0 y 4095
    
    def leer_datos(self):
        raw = self.adc.read()
        voltaje = raw * 3.3 / 4095
        porcentaje = (raw / 4095) * 100
        lloviendo = "LLOVIENDO" if raw > 1500 else "NO LLUVIA"
        return {"raw": raw, "voltaje": voltaje, "porcentaje": porcentaje, "lluvia": lloviendo}
#//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////     
#HC-SR04
#funciona enviando pulsos ultrasonicos (TRIG) y midiendo cuanto tiempo demora en regresar (ECHO)
class SensorUltrasonico:
    def __init__(self, pin_trig, pin_echo):
        self.trig = Pin(pin_trig, Pin.OUT)
        self.echo = Pin(pin_echo, Pin.IN)
        
    def leer_distancia(self):
        self.trig.value(0)
        time.sleep_us(2)
        self.trig.value(1)
        time.sleep_us(10)
        self.trig.value(0)
        duracion = time_pulse_us(self.echo, 1, 30000)
        if duracion < 0:
            return -1.0
        return (duracion * 0.0343) / 2
#//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////         
class SensorSonido:
    def __init__(self, pin_datos, ventana_ms=1000):
        self.sensor = Pin(pin_datos, Pin.IN)
        self.ventana_ms = ventana_ms
        self.estado_anterior = 1  # reposo (activo en bajo)
        self.inicio_ventana = time.ticks_ms()
        self.tiempo_activo_ms = 0
        self.marca_inicio_activo = 0
        self.ultimo_resultado = {"raw": 0, "porcentaje": 0.0, "nivel": "SILENCIO"}

    def actualizar(self):
        ahora = time.ticks_ms()
        estado_actual = self.sensor.value()

        # Empieza a contar tiempo activo cuando pasa a sonido
        if self.estado_anterior == 1 and estado_actual == 0:
            self.marca_inicio_activo = ahora

        # Suma el tiempo que estuvo en sonido cuando vuelve a silencio
        if self.estado_anterior == 0 and estado_actual == 1:
            self.tiempo_activo_ms += time.ticks_diff(ahora, self.marca_inicio_activo)

        # Si se quedo sonando hasta el cierre de la ventana, cuenta lo que lleva hasta ahora
        if estado_actual == 0 and time.ticks_diff(ahora, self.inicio_ventana) >= self.ventana_ms:
            self.tiempo_activo_ms += time.ticks_diff(ahora, self.marca_inicio_activo)
            self.marca_inicio_activo = ahora

        self.estado_anterior = estado_actual

        if time.ticks_diff(ahora, self.inicio_ventana) >= self.ventana_ms:
            tiempo_total = time.ticks_diff(ahora, self.inicio_ventana)
            porcentaje = min(100.0, (self.tiempo_activo_ms / tiempo_total) * 100.0)

            if porcentaje < 5:
                nivel = "SILENCIO"
            elif porcentaje < 25:
                nivel = "RUIDO BAJO"
            elif porcentaje < 60:
                nivel = "RUIDO MEDIO"
            else:
                nivel = "RUIDO ALTO"

            self.ultimo_resultado = {
                "raw": self.tiempo_activo_ms,
                "porcentaje": porcentaje,
                "nivel": nivel
            }

            self.tiempo_activo_ms = 0
            self.inicio_ventana = ahora

    def leer_datos(self):
        return self.ultimo_resultado
#//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////         
#Sensor optico APDS9960 (color y proximidad)
class SensorColor:
    def __init__(self, i2c_bus):
        from apds9960.device import APDS9960
        from i2c_wrapper import I2CWrapper
        wrapper = I2CWrapper(i2c_bus, 0x39)
        self.sensor = APDS9960(wrapper)
        self.sensor.enableLightSensor()
        self.sensor.enableProximitySensor()
        
    def leer_datos(self):
        prox = self.sensor.readProximity()
        a = self.sensor.readAmbientLight()
        r = self.sensor.readRedLight()
        g = self.sensor.readGreenLight()
        b = self.sensor.readBlueLight()
        
        if prox > 200:
            estado = "MUY CERCA"
        elif prox > 100:
            estado = "CERCA"
        elif prox > 50:
            estado = "MEDIO"
        else:
            estado = "LEJOS"
            
        total = r + g + b
        color_detectado = "DESCONOCIDO"
        
        if estado == "CERCA    " or estado == "MUY CERCA":
            if total < 100:
                color_detectado = "NEGRO      "
            else:
        
                pr = r / total
                pg = g / total
                pb = b / total
                
                if abs(pr - pg) < 0.08 and abs(pg - pb) < 0.08:
                    color_detectado = "BLANCO     "
                elif pr > 0.38 and pg > 0.38 and pb < 0.15:
                    color_detectado = "AMARILLO   "
                elif pr > 0.50 and pg > 0.25 and pg < 0.40 and pb < 0.15:
                    color_detectado = "NARANJA    "
                elif pr > 0.45 and pr > pg * 1.3 and pr > pb * 1.5:
                    color_detectado = "ROJO       "
                elif pg > 0.45 and pg > pr * 1.2 and pg > pb * 1.2:
                    color_detectado = "VERDE      "
                elif pb > 0.45 and pb > pr * 1.2 and pb > pg * 1.2:
                    color_detectado = "AZUL       "
                elif pg > 0.30 and pb > 0.30:
                    color_detectado = "CIAN       "
                elif pr > 0.30 and pb > 0.30:
                    color_detectado = "MAGENTA    "
        
        
        return {
            "prox": prox,
            "estado": estado.strip(), 
            "amb": a,
            "r": r,
            "g": g,
            "b": b,
            "color": color_detectado
        }
#//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////             
#temt6000
#fotoresistor de luz --- mas luz mas corriente
class SensorLuz:
    def __init__(self, pin_adc):
        self.adc = ADC(Pin(pin_adc))
        self.adc.atten(ADC.ATTN_11DB)
        self.adc.width(ADC.WIDTH_12BIT)
        
    def leer_datos(self):
        raw = self.adc.read()
        voltaje = raw * 3.3 / 4095
        porcentaje = (raw / 4095) * 100

        if raw < 500:
            nivel = "MUY OSCURO"
        elif raw < 1500:
            nivel = "TENUE"
        elif raw < 2500:
            nivel = "NORMAL"
        elif raw < 3500:
            nivel = "BRILLANTE"
        else:
            nivel = "MUY BRILLANTE"
            
        return {"raw": raw, "voltaje": voltaje, "porcentaje": porcentaje, "nivel": nivel}

#//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////           
# sensor de GPS NEO6M
class SensorGPS:

    def __init__(self, uart_id=2, baudrate=9600, tx_pin=17, rx_pin=16):
        self.gps_serial = UART(
            uart_id,
            baudrate=baudrate,
            tx=tx_pin,
            rx=rx_pin,
            timeout=500
        )

        self.lat = 0.0
        self.lon = 0.0
        self.sat = False
        self.sat_count = 0


    def _nmea_a_decimal(self, raw, hemisferio, es_longitud=False):
        try:

            if not raw:
                return 0.0

            indice = 3 if es_longitud else 2

            grados = int(raw[:indice])
            minutos = float(raw[indice:])

            decimal = grados + (minutos / 60.0)

            if hemisferio == "S" or hemisferio == "W":
                decimal = -decimal

            return decimal

        except:
            return 0.0


    def leer_posicion(self):

        try:

            while self.gps_serial.any():

                linea = self.gps_serial.readline()

                if not linea:
                    break

                linea_str = linea.decode(
                    "utf-8",
                    "ignore"
                ).strip()

                partes = linea_str.split(",")


                # ==========================================
                # GPGGA → número de satélites
                # ==========================================

                if linea_str.startswith("$GPGGA"):

                    if len(partes) > 7:

                        try:
                            self.sat_count = int(partes[7])
                        except:
                            pass


                # ==========================================
                # GPRMC → posición
                # ==========================================

                elif linea_str.startswith("$GPRMC"):

                    if len(partes) > 6:

                        # A = posición válida
                        if partes[2] == "A":

                            lat = self._nmea_a_decimal(
                                partes[3],
                                partes[4],
                                False
                            )

                            lon = self._nmea_a_decimal(
                                partes[5],
                                partes[6],
                                True
                            )

                            self.lat = lat
                            self.lon = lon
                            self.sat = True

                        else:

                            self.sat = False


        except Exception as e:

            print("Error GPS:", e)


        return {
            "lat": self.lat,
            "lon": self.lon,
            "sat": self.sat,
            "sat_count": self.sat_count
        }
#//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////  
class SensorDHT22:
    def __init__(self, pin_datos):
        self.sensor = dht.DHT22(Pin(pin_datos))
        
    def leer_datos(self):
        try:
            self.sensor.measure()
            return{
                "temperatura": self.sensor.temperature(),
                "humedad": self.sensor.humidity()
                }
        except Exception as e:
            print("Error DHT22:", e)
            return{"temperatura": 0.0,
                    "humedad": 0.0}
 
#//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

class SensorPMS3003:
    def __init__(self, uart_id=1, baudrate=9600, tx_pin=33, rx_pin=32):
        self.pms_serial = UART(uart_id, baudrate=baudrate, tx=tx_pin, rx=rx_pin, timeout=500)
        
    def leer_datos(self):
        datos = {"pm1": 0, "pm25": 0, "pm10": 0}
        
        print(self.pms_serial.any())
        while self.pms_serial.any() > 0:
            buffer = self.pms_serial.read(32)
            
            # 1. Verificamos que buffer exista Y que tenga AL MENOS 24 bytes (o 32 bytes completos)
            if buffer and len(buffer) >= 23:
                # 2. Ahora es seguro acceder a buffer[0] y buffer[1]
                if buffer[0] == 0x42 and buffer[1] == 0x4D:
                    datos["pm1"] = (buffer[10] << 8) | buffer[11]
                    datos["pm25"] = (buffer[12] << 8) | buffer[13]
                    datos["pm10"] = (buffer[14] << 8) | buffer[15]
                
        return datos     
