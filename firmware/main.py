from machine import Pin, SoftI2C
import time
from machine_i2c_lcd import I2cLcd
import sensores
import os
import network
import urequests
verificar_internet = False
# Parametros de configuracion de la pantalla LCD 
I2C_ADDR = 0x27
i2c = SoftI2C(sda=Pin(21), scl=Pin(22), freq=20000)
lcd = I2cLcd(i2c, I2C_ADDR, 4, 20)
time.sleep(1)

#Configuracion de wifi y nube
WIFI_SSID = "Micjor"
WIFI_PASSWORD = "1035423454-A"
THINGSPEAK_WRITE_KEY = "9OKYZ886YQB5YH2A"
THINGSPEAK_URL = "http://api.thingspeak.com/update"

def conectar_wifi():
    wlan = network.WLAN(network.STA_IF)
    
    if wlan.active():
        wlan.active(False)
        time.sleep(0.5)
        
    wlan.active(True)
    
    try:
        wlan.config(pm=network.WLAN.PM_NONE)
    except:
        pass
    
    if not wlan.isconnected():
        print("Conectando a la red Wi-fi...")
        wlan.connect(WIFI_SSID, WIFI_PASSWORD)
        
        intentos = 0
        while not wlan.isconnected() and intentos < 10:
            time.sleep(1)
            intentos += 1
            
    if wlan.isconnected():
        print("Conexion exitosa")
        lcd.move_to(0,2)
        lcd.putstr("Conexion exitosa")
        time.sleep(1)
        print("Configuracion de red:", wlan.ifconfig())
        time.sleep(0.8)
        return True
    else:
        print("No se pudo conectar a la red")
        lcd.move_to(0,2)
        lcd.putstr("Error al conectar...")
        time.sleep(0.8) 
        return False

def enviar_datos_nube(dht, luz, ruido, pms, gps):
    datos = (
        f"?api_key={THINGSPEAK_WRITE_KEY}"
        f"&field1={dht['temperatura']:.1f}"
        f"&field2={dht['humedad']:.1f}"
        f"&field3={ruido['porcentaje']:.1f}"
        f"&field4={luz['porcentaje']:.1f}"
        f"&field5={pms['pm1']:.1f}"
        f"&field6={pms['pm25']:.1f}"
        f"&field7={pms['pm10']:.1f}"
        f"&lat={gps['lat']:.6f}"
        f"&long={gps['lon']:.6f}"
        f"&status={1 if gps['sat'] else 0}"
        )
    
    url_final = THINGSPEAK_URL + datos
    
    try:
        respuesta = urequests.get(url_final)
        if respuesta.status_code == 200:
            print(f"[NUBE] Datos subidos con éxito. ID Registro: {respuesta.text}")
        else:
            print(f"[NUBE] Error de servidor. Código: {respuesta.status_code}")
        respuesta.close()  # CRUCIAL: Libera memoria RAM en MicroPython
    except Exception as e:
        print(f"[NUBE] Error de conexión: {e}")
    
try:
    print("cargando pantalla")
    lcd.clear()
    lcd.putstr("Cargando pantalla")
except Exception as e:
    print("Error al cargar pantalla")
time.sleep(2)

lcd.move_to(0,1)
lcd.putstr("Cargando sensores...")
#Asignacion de los pines de los sensores
lluvia = sensores.SensorLluvia(pin_adc=34)
luz_temt = sensores.SensorLuz(pin_adc=35)
sonido_ky = sensores.SensorSonido(pin_datos=25)
dht22 = sensores.SensorDHT22(pin_datos=15)
ultrasonico = sensores.SensorUltrasonico(pin_trig=12, pin_echo=13)
pms = sensores.SensorPMS3003(uart_id=1,tx_pin=33, rx_pin=32)
apds = sensores.SensorColor(i2c)
gps = sensores.SensorGPS()

# Variables para el control de la interfaz de la pantalla
pantalla_actual = 0
total_pantallas = 6

#Configuracion del DATA LOGGER
ARCHIVO_LOG = "bitacora_rover.csv"

try:
    os.stat(ARCHIVO_LOG)
    print(f"Archivo {ARCHIVO_LOG} detectado. Continuando registro...")
except OSError:
    with open(ARCHIVO_LOG, "w") as f:
        f.write("Tiempo,Temperatura_Ambiental,Humedad,Distancia,Ruido,Luminosidad,Proximidad,Color,PM1_0,PM2_5,PM10\n")
    print(f"Archivo {ARCHIVO_LOG} creado con exito.")
time.sleep(2)

tiempo_ultimo_guardado = time.time()
INTERVALO_LOG_SEGUNDOS= 10
tiempo_inicio_sistema = time.time()

lcd.clear()
lcd.putstr("--- EcoRover ---")
time.sleep(1.5)
lcd.move_to(0,1)
lcd.putstr("Conectando wifi...")
time.sleep(0.8)

cont_intento = 0
while verificar_internet == False:
    
    if cont_intento<4:
        wifi_activo = conectar_wifi()
        if wifi_activo == True:
            verificar_internet = True
            break
        else:
            cont_intento += 1
    else:
        verificar_internet = True
        lcd.clear()
        lcd.putstr("No se pudo conectar el wifi")
        time.sleep(2)
    lcd.move_to(0,3)
    lcd.putstr(f"Intento {cont_intento}/3")
        
lcd.clear()

segundo_viejo = 0

#timesleeps
ultimo_cambio_pantalla = time.ticks_ms()
INTERVALO_PANTALLA_MS = 10000

ultima_lectura_dht = 0
INTERVALO_DHT_MS = 2500
datos_dht = {"temperatura": 0.0, "humedad": 0.0}

INTERVALO_RUIDO_MS = 1000
ultima_lectura_ruido = 0
datos_ruido = {"raw": 0, "porcentaje": 0.0, "nivel": "SILENCIO"}

ultima_lectura_pms = 0
INTERVALO_PMS_MS = 1500


#Bucle principal
while True:
    ahora = time.ticks_ms()
    sonido_ky.actualizar() 
    if time.ticks_diff(ahora, ultimo_cambio_pantalla) >= INTERVALO_PANTALLA_MS:
        pantalla_actual = (pantalla_actual + 1) % total_pantallas
        lcd.clear()
        ultimo_cambio_pantalla = ahora
        
    try:
        #dht22
        if time.ticks_diff(ahora, ultima_lectura_dht) >= INTERVALO_DHT_MS:
            datos_dht = dht22.leer_datos()
            ultima_lectura_dht = ahora
        
        datos_lluvia = lluvia.leer_datos()
        
        #sensor sonido
        if time.ticks_diff(ahora, ultima_lectura_ruido) >= INTERVALO_RUIDO_MS:
            datos_ruido = sonido_ky.leer_datos()
            ultima_lectura_ruido = ahora
            
        datos_ruido = sonido_ky.leer_datos()
        datos_apds = apds.leer_datos()
        datos_luz = luz_temt.leer_datos()
        datos_gps = gps.leer_posicion()
        
        if time.ticks_diff(ahora,ultima_lectura_pms) >= INTERVALO_PMS_MS:
            datos_pms = pms.leer_datos()
            ultima_lectura_pms = ahora
        
        
        tiempo_actual = time.time()
        segundos_transcurridos = tiempo_actual - tiempo_ultimo_guardado
        segundos_totales_sistema = tiempo_actual - tiempo_inicio_sistema
        tiempo_restante = INTERVALO_LOG_SEGUNDOS - segundos_transcurridos
        
        if segundo_viejo != tiempo_actual:
            segundo_viejo = tiempo_actual
            print(f"[Reloj] Tiempo total: {segundos_totales_sistema}s | Faltan {tiempo_restante}s para el siguiente registro...")
            
        
        
        if segundos_transcurridos >= INTERVALO_LOG_SEGUNDOS:
              
            linea_csv = (f"{segundos_totales_sistema},{datos_dht['temperatura']:.1f},"
                         f"{datos_dht['humedad']:.1f},"
                         f"{datos_ruido['porcentaje']:.1f},{datos_luz['porcentaje']:.1f},"
                         f"{datos_apds['prox']},{datos_apds['color'].strip()},"
                         f"{datos_pms['pm1']},{datos_pms['pm25']},{datos_pms['pm10']}\n")
            
            print(linea_csv)
            with open(ARCHIVO_LOG, "a") as f:
                f.write(linea_csv)
                
            print(f"\n[DATA LOG LOGRADO] Escrito en la bitácora a los {segundos_totales_sistema}s\n")
            
            wlan = network.WLAN(network.STA_IF)
            if wlan.isconnected():
                print("[NUBE] Transmitiendo datos de sensores...")
                print(datos_gps)
                enviar_datos_nube(datos_dht, datos_luz, datos_ruido, datos_pms, datos_gps)
            else:
                print("[NUBE] Saltado: Sin conexión Wi-Fi en este momento.")
                
            tiempo_ultimo_guardado = tiempo_actual
    
        #Control de las pantallas que se mostraran en la LCD
        if pantalla_actual == 0:
            # PANTALLA 1: Clima y Lluvia (BME680 + SEN0121)
            lcd.move_to(0, 0)
            lcd.putstr("- AMBIENTE/LLUVIA -")
            lcd.move_to(0, 1)
            lcd.putstr(f"T:{datos_dht['temperatura']:.1f}C H:{datos_dht['humedad']:.1f}%")
            lcd.move_to(0, 2)
            lcd.putstr("Estado lluvia")
            lcd.move_to(0,3)
            lcd.putstr(f"{datos_lluvia['lluvia']}")

        elif pantalla_actual == 1:
            # PANTALLA 2: Distancia y Ruido (HC-SR04 + KY-038)
            lcd.move_to(0, 0)
            lcd.putstr("--- RUIDO ---")
            lcd.move_to(0, 1)
            lcd.putstr(f"Ruido: {datos_ruido['raw']:<4} ({datos_ruido['porcentaje']:.1f}%)")
            lcd.move_to(0, 2)
            lcd.putstr(f"Nivel: {datos_ruido['nivel']:<12}")

        elif pantalla_actual == 2:
            # PANTALLA 3: Espectro de color (APDS9960)
            lcd.move_to(0, 0)
            lcd.putstr("--- COLOR & PROX ---")
            
            lcd.move_to(0, 1)
            # Mostramos el valor numérico de proximidad y la etiqueta de distancia
            lcd.putstr(f"Prox: {datos_apds['prox']:<3} | {datos_apds['estado']:<9}") 
            
            lcd.move_to(0, 2)
            # Mostramos el nombre del color detectado
            lcd.putstr(f"COLOR: {datos_apds['color']}") 
            
            lcd.move_to(0, 3)
            # Valores puros RGB capturados
            lcd.putstr(f"R:{datos_apds['r']} G:{datos_apds['g']} B:{datos_apds['b']}   ")
        
        elif pantalla_actual == 3:
            # PANTALLA 4: Luminosidad TEMT6000 
            lcd.move_to(0, 0)
            lcd.putstr("--- LUMINOSIDAD ---")
            lcd.move_to(0, 1)
            lcd.putstr(f"Raw Luz: {datos_luz['raw']:<4}       ")
            lcd.move_to(0, 2)
            lcd.putstr(f"Porcentaje: {datos_luz['porcentaje']:.1f}% ")
            lcd.move_to(0, 3)
            lcd.putstr(f"Nivel: {datos_luz['nivel']:<12}")
        
        elif pantalla_actual == 4:
            # PANTALLA 5: Sistema de Navegación GPS (NEO-6M)
            datos_gps = gps.leer_posicion()
            
            lcd.move_to(0, 0)
            lcd.putstr("--- NAVEGACION ---")
            
            if datos_gps["sat"]:
                lcd.move_to(0, 1)
                lcd.putstr(f"Lat: {datos_gps['lat']:<16}")
                lcd.move_to(0, 2)
                lcd.putstr(f"Lon: {datos_gps['lon']:<16}")
                lcd.move_to(0, 3)
                lcd.putstr(f"Estado: {datos_gps['sat']}")
            else:
                lcd.move_to(0, 1)
                lcd.putstr("Lat: Buscando...    ")
                lcd.move_to(0, 2)
                lcd.putstr("Lon: Buscando...    ")
                lcd.move_to(0, 3)
                lcd.putstr("Estado: SIN SENAL   ")
        
        elif pantalla_actual == 5:
            lcd.move_to(0, 0)
            lcd.putstr("--- AIRE ---")
            lcd.move_to(0, 1)
            lcd.putstr(f"PM1.0: {datos_pms['pm1']} ug/m3   ")
            lcd.move_to(0, 2)
            lcd.putstr(f"PM2.5: {datos_pms['pm25']} ug/m3   ")
            lcd.move_to(0, 3)
            lcd.putstr(f"PM10 : {datos_pms['pm10']} ug/m3   ")
            
    except Exception as error_ciclo:
        print(f"Error detectado: {error_ciclo}")

    time.sleep(0.1) 
        
