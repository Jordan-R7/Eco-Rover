from machine import Pin, time_pulse_us
import time

# ===== Configuración de pines =====
TRIG_f = Pin(5, Pin.OUT)
ECHO_f = Pin(18, Pin.IN)
TRIG_d = Pin(19, Pin.OUT)
ECHO_d = Pin(21, Pin.IN)
TRIG_i = Pin(16, Pin.OUT)  
ECHO_i = Pin(17, Pin.IN)

IN1 = Pin(27, Pin.OUT)
IN2 = Pin(26, Pin.OUT)
IN3 = Pin(25, Pin.OUT)
IN4 = Pin(33, Pin.OUT)

# ===== Parámetros =====
DISTANCIA_MIN = 35            # cm, aumentada para reaccionar antes
DISTANCIA_MIN_DIAG   = 25 
TIEMPO_GIRO_REVISAR = 0.4     # segundos que gira hacia cada lado para revisar
TIEMPO_REGRESO = 0.4          # segundos para volver a la posición inicial
PAUSA_ANTES_GIRO = 1.5        # segundos de pausa antes de cada giro
PAUSA_DESPUES_GIRO = 1.5      # segundos de pausa después de cada giro

# ===== Funciones de motores (sin PWM, velocidad fija por jumpers) =====
def motor_avanzar():
    IN1.value(0); IN2.value(1)
    IN3.value(0); IN4.value(1)

def motor_giro_izquierda():
    IN1.value(1); IN2.value(0)
    IN3.value(0); IN4.value(1)

def motor_giro_derecha():
    IN1.value(0); IN2.value(1)
    IN3.value(1); IN4.value(0)

def motor_detener():
    IN1.value(0); IN2.value(0)
    IN3.value(0); IN4.value(0)

def motor_retroceder():
    IN1.value(1); IN2.value(0)
    IN3.value(1); IN4.value(0)

# ===== Función de ultrasonido =====
def medir_distancia(TRIG,ECHO):
    TRIG.value(0)
    time.sleep_us(2)
    TRIG.value(1)
    time.sleep_us(10)
    TRIG.value(0)

    duracion = time_pulse_us(ECHO, 1, 30000)
    if duracion < 0:
        return 999
    else:
        distancia = (duracion * 0.0343) / 2
        return distancia    
    

# ===== Girar y medir hacia un lado, luego regresar (con pausas) =====
def revisar_lado(funcion_giro, tiempo_giro, tiempo_regreso, funcion_regreso):
    motor_detener()
    time.sleep(PAUSA_ANTES_GIRO)

    funcion_giro()
    time.sleep(tiempo_giro)
    motor_detener()
    time.sleep(PAUSA_DESPUES_GIRO)
    time.sleep_us(500)
    distancia = medir_distancia(TRIG_f,ECHO_f)

    funcion_regreso()
    time.sleep(tiempo_regreso)
    motor_detener()
    time.sleep(PAUSA_DESPUES_GIRO)

    return distancia

# ===== Lógica al detectar obstáculo =====
def manejar_obstaculo():
    motor_detener()
    print("Obstáculo detectado, analizando lados...")
    time.sleep(PAUSA_ANTES_GIRO)

    distancia_derecha = revisar_lado(
        motor_giro_derecha, TIEMPO_GIRO_REVISAR,
        TIEMPO_REGRESO, motor_giro_izquierda
    )
    print("Distancia a la derecha:", distancia_derecha, "cm")

    distancia_izquierda = revisar_lado(
        motor_giro_izquierda, TIEMPO_GIRO_REVISAR,
        TIEMPO_REGRESO, motor_giro_derecha
    )
    print("Distancia a la izquierda:", distancia_izquierda, "cm")

    if distancia_derecha < DISTANCIA_MIN and distancia_izquierda < DISTANCIA_MIN:
        print("Ambos lados bloqueados, girando para buscar salida...")
        motor_detener()
        time.sleep(PAUSA_ANTES_GIRO)
        motor_giro_derecha()
        time.sleep(TIEMPO_GIRO_REVISAR)
        motor_detener()
        time.sleep(PAUSA_DESPUES_GIRO)

    elif distancia_derecha >= distancia_izquierda:
        print("Continuando por la derecha")
        motor_detener()
        time.sleep(PAUSA_ANTES_GIRO)
        motor_giro_derecha()
        time.sleep(TIEMPO_GIRO_REVISAR)
        motor_detener()
        time.sleep(PAUSA_DESPUES_GIRO)

    else:
        print("Continuando por la izquierda")
        motor_detener()
        time.sleep(PAUSA_ANTES_GIRO)
        motor_giro_izquierda()
        time.sleep(TIEMPO_GIRO_REVISAR)
        motor_detener()
        time.sleep(PAUSA_DESPUES_GIRO)

# ===== Loop principal =====
def main():
    while True:
        distancia_f = medir_distancia(TRIG_f,ECHO_f)
        distancia_d = medir_distancia(TRIG_d,ECHO_d)
        distancia_i = medir_distancia(TRIG_i,ECHO_i)
        print(f"F:{distancia_f:.1f}  D:{distancia_d:.1f} I:{distancia_i:.1f}")
        if distancia_f < DISTANCIA_MIN:
            manejar_obstaculo()
        elif distancia_d < DISTANCIA_MIN_DIAG:
            motor_detener()
            time.sleep(0.2)
            motor_giro_derecha()
            time.sleep(TIEMPO_GIRO_REVISAR * 0.7) 
            motor_detener()
            time.sleep(0.3)
        elif distancia_i < DISTANCIA_MIN_DIAG:
            motor_detener()
            time.sleep(0.2)
            motor_giro_izquierda()
            time.sleep(TIEMPO_GIRO_REVISAR * 0.7) 
            motor_detener()
            time.sleep(0.3)
        else:
            motor_avanzar()

        time.sleep(0.05)

main()
