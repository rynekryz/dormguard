#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_NeoPixel.h>

const char* ssid = "your wifi name";
const char* password = "your wifi password";

const char* googleScriptURL =
"google sheet api url for door logging";

const char* ctrlsScriptURL =
"google sheets api url for device controls";

#define REED_PIN   4
#define TRIG_PIN   19
#define ECHO_PIN   18
#define BUZZER_PIN 27

#define LED_PIN    32
#define LED_COUNT  8

#define ULTRASONIC_THRESHOLD_CM 32
#define ULTRASONIC_TIMEOUT_US   25000

Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);

portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;

bool doorOpen      = false;
bool lastDoorState = false;
bool lastDoorRaw   = false;
unsigned long doorDebounceTime = 0;

bool motionDetected  = false;
bool lastMotionState = false;
bool lastMotionRaw   = false;
unsigned long motionDebounceTime = 0;

#define DEBOUNCE_MS         50   
#define MOTION_DEBOUNCE_MS  400  

bool alertActive     = false;
bool lastAlertActive = false;
bool alertSuppressed = false;
bool beepState       = false;

bool lampOn              = false;
unsigned long lampOffTime = 0;

unsigned long doorOpenTime   = 0;
unsigned long alertStartTime = 0;
unsigned long lastToggle     = 0;

bool apiLedState    = true;
bool apiBuzzerState = true;
bool apiLampState   = true;
bool stopAlert      = false;

int sharedLightCode = 0;
int lastSentLightCode = -1; 

typedef struct {
  char state[10];   
  int  lightCode;
} DoorMessage;

typedef struct {
  char state[4];
} AlertMessage;

QueueHandle_t doorQueue;
QueueHandle_t alertQueue;

void setAllLEDs(uint32_t color)
{
  for (int i = 0; i < LED_COUNT; i++)
  {
    strip.setPixelColor(i, color);
  }
  strip.show();
}

void clearAllLEDs()
{
  strip.clear();
  strip.show();
}

void flushQueues()
{
  DoorMessage  dm;
  AlertMessage am;
  while (xQueueReceive(doorQueue,  &dm, 0) == pdTRUE) {}
  while (xQueueReceive(alertQueue, &am, 0) == pdTRUE) {}
}

void sendAlertState(bool active)
{
  AlertMessage msg;
  memset(&msg, 0, sizeof(msg));
  strcpy(msg.state, active ? "1" : "0");
  xQueueSend(alertQueue, &msg, 0);
}

void queueDoorLog(const char* doorState, int lightCode)
{
  DoorMessage doorMsg;
  memset(&doorMsg, 0, sizeof(doorMsg));
  strncpy(doorMsg.state, doorState, sizeof(doorMsg.state) - 1);
  doorMsg.lightCode = lightCode;
  xQueueSend(doorQueue, &doorMsg, 0);
}

long readUltrasonicCM()
{
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, ULTRASONIC_TIMEOUT_US);
  if (duration == 0) return -1;

  return duration * 0.034 / 2;
}

void sheetTask(void *parameter)
{
  HTTPClient http;

  for (;;)
  {
    if (WiFi.status() != WL_CONNECTED)
    {
      vTaskDelay(500 / portTICK_PERIOD_MS);
      continue;
    }

    DoorMessage doorMsg;
    memset(&doorMsg, 0, sizeof(doorMsg));
    if (xQueueReceive(doorQueue, &doorMsg, 0) == pdTRUE)
    {
      String val = String(doorMsg.state);
      if (val == "OPEN" || val == "CLOSED")
      {
        String url = String(googleScriptURL) + "?door=" + val + "&light=" + String(doorMsg.lightCode);
        http.setTimeout(5000);
        http.begin(url);
        int code = http.GET();
        if (code > 0) Serial.println("door > " + val + " light > " + String(doorMsg.lightCode));
        else          Serial.println("door err: " + String(code));
        http.end();
      }
    }

    AlertMessage alertMsg;
    memset(&alertMsg, 0, sizeof(alertMsg));
    if (xQueueReceive(alertQueue, &alertMsg, 0) == pdTRUE)
    {
      String val = String(alertMsg.state);
      if (val == "1" || val == "0")
      {
        String url = String(ctrlsScriptURL) + "?alert=" + val;
        http.setTimeout(5000);
        http.begin(url);
        int code = http.GET();
        if (code > 0) Serial.println("alert > " + val);
        else          Serial.println("alert err: " + String(code));
        http.end();
      }
    }

    vTaskDelay(20 / portTICK_PERIOD_MS);
  }
}

void controlTask(void *parameter)
{
  HTTPClient http;
  unsigned long lastControlFetch = 0;

  for (;;)
  {
    if (WiFi.status() != WL_CONNECTED)
    {
      Serial.println("wifi lost");
      WiFi.begin(ssid, password);
      vTaskDelay(2000 / portTICK_PERIOD_MS);
      continue;
    }

    if (millis() - lastControlFetch > 2000)
    {
      lastControlFetch = millis();
      http.setTimeout(5000);
      http.begin(ctrlsScriptURL);
      http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);

      int code = http.GET();
      if (code > 0)
      {
        String payload = http.getString();

        StaticJsonDocument<256> doc;
        DeserializationError err = deserializeJson(doc, payload);

        if (!err &&
            doc.containsKey("led") &&
            doc.containsKey("buzzer") &&
            doc.containsKey("stop") &&
            doc.containsKey("lamp"))
        {
          bool newLed    = doc["led"].as<int>()    == 1;
          bool newBuzzer = doc["buzzer"].as<int>() == 1;
          bool newStop   = doc["stop"].as<int>()   == 1;
          bool newLamp   = doc["lamp"].as<int>()   == 1;

          portENTER_CRITICAL(&mux);
          bool prevLamp      = apiLampState;
          bool configChanged = (newLed != apiLedState) || (newBuzzer != apiBuzzerState) || (newLamp != apiLampState);
          apiLedState    = newLed;
          apiBuzzerState = newBuzzer;
          stopAlert      = newStop;
          apiLampState   = newLamp;
          portEXIT_CRITICAL(&mux);

          if (!newLamp)
          {
            portENTER_CRITICAL(&mux);
            lampOn = false;
            portEXIT_CRITICAL(&mux);
          }

          if (newLamp && !prevLamp)
          {
            portENTER_CRITICAL(&mux);
            bool irActive = motionDetected;
            portEXIT_CRITICAL(&mux);

            if (irActive)
            {
              portENTER_CRITICAL(&mux);
              lampOn = true;
              portEXIT_CRITICAL(&mux);
            }
          }

          if (configChanged)
          {
            Serial.printf("API | LED=%d BUZ=%d LAMP=%d\n", newLed, newBuzzer, newLamp);
          }
        }
        else
        {
          Serial.println("api: bad json");
        }
      }
      else
      {
        Serial.println("api err: " + String(code));
        http.end();
        vTaskDelay(2000 / portTICK_PERIOD_MS);
        continue;
      }

      http.end();
    }

    vTaskDelay(20 / portTICK_PERIOD_MS);
  }
}

void sensorTask(void *parameter)
{
  unsigned long lastUltrasonicRead = 0;

  for (;;)
  {
    unsigned long now = millis();

    bool doorRaw = digitalRead(REED_PIN) == LOW;

    if (doorRaw != lastDoorRaw)
    {
      lastDoorRaw      = doorRaw;
      doorDebounceTime = now;
    }

    if ((now - doorDebounceTime >= DEBOUNCE_MS) && (doorRaw != lastDoorState))
    {
      lastDoorState = doorRaw;

      portENTER_CRITICAL(&mux);
      doorOpen = doorRaw;
      if (doorRaw) doorOpenTime = millis();
      int currentLightCode = sharedLightCode;
      portEXIT_CRITICAL(&mux);

      queueDoorLog(doorRaw ? "OPEN" : "CLOSED", currentLightCode);

      portENTER_CRITICAL(&mux);
      lastSentLightCode = currentLightCode; 
      portEXIT_CRITICAL(&mux);

      if (doorRaw)
      {
        portENTER_CRITICAL(&mux);
        alertActive = false;
        portEXIT_CRITICAL(&mux);
      }
      else
      {
        portENTER_CRITICAL(&mux);
        alertActive     = false;
        alertSuppressed = false;
        portEXIT_CRITICAL(&mux);

        digitalWrite(BUZZER_PIN, LOW);

        portENTER_CRITICAL(&mux);
        bool lampShouldBeOn = lampOn && apiLampState;
        portEXIT_CRITICAL(&mux);

        if (lampShouldBeOn)
        {
          setAllLEDs(strip.Color(255, 255, 255));
        }
        else
        {
          clearAllLEDs();
        }
      }
    }

    bool motionRaw = false;
    if (now - lastUltrasonicRead > 100)
    {
      lastUltrasonicRead = now;
      long distanceCM = readUltrasonicCM();
      motionRaw = (distanceCM > 0 && distanceCM <= ULTRASONIC_THRESHOLD_CM);
    }
    else
    {
      motionRaw = lastMotionRaw;
    }

    if (motionRaw != lastMotionRaw)
    {
      lastMotionRaw      = motionRaw;
      motionDebounceTime = now;
    }

    if ((now - motionDebounceTime >= MOTION_DEBOUNCE_MS) && (motionRaw != lastMotionState))
    {
      lastMotionState = motionRaw;

      portENTER_CRITICAL(&mux);
      motionDetected = motionRaw;
      portEXIT_CRITICAL(&mux);

      if (motionRaw)
      {
        portENTER_CRITICAL(&mux);
        bool lampAllowed = apiLampState;
        portEXIT_CRITICAL(&mux);

        if (lampAllowed)
        {
          portENTER_CRITICAL(&mux);
          lampOn = true;
          portEXIT_CRITICAL(&mux);
        }
      }
      else
      {
        portENTER_CRITICAL(&mux);
        lampOffTime = millis();
        portEXIT_CRITICAL(&mux);
      }
    }

    vTaskDelay(10 / portTICK_PERIOD_MS);
  }
}

void alertTask(void *parameter)
{
  bool lampIsVisuallyOn = false;

  for (;;)
  {
    unsigned long now = millis();

    portENTER_CRITICAL(&mux);
    bool currentDoorOpen              = doorOpen;
    bool currentStopAlert             = stopAlert;
    bool currentApiLed                = apiLedState;
    bool currentApiBuzzer             = apiBuzzerState;
    bool currentApiLamp               = apiLampState;
    bool currentAlertActive           = alertActive;
    bool currentAlertSuppressed       = alertSuppressed;
    bool currentLampOn                = lampOn;
    bool currentMotion                = motionDetected;
    unsigned long currentDoorOpenTime = doorOpenTime;
    unsigned long currentLampOffTime  = lampOffTime;
    portEXIT_CRITICAL(&mux);

    if (currentAlertActive != lastAlertActive)
    {
      lastAlertActive = currentAlertActive;
      sendAlertState(currentAlertActive);
    }

    bool lampActuallyOn = currentLampOn && currentApiLamp;
    int lightCode = lampActuallyOn
                  ? (currentMotion ? 3 : 2)
                  : (currentMotion ? 1 : 0);

    portENTER_CRITICAL(&mux);
    sharedLightCode = lightCode;
    int prevSentLightCode = lastSentLightCode;
    portEXIT_CRITICAL(&mux);

    if (lightCode != prevSentLightCode)
    {
      portENTER_CRITICAL(&mux);
      lastSentLightCode = lightCode;
      bool doorForLog = doorOpen;
      portEXIT_CRITICAL(&mux);

      queueDoorLog(doorForLog ? "OPEN" : "CLOSED", lightCode);
    }

    if (!currentApiLamp && currentLampOn)
    {
      portENTER_CRITICAL(&mux);
      lampOn = false;
      portEXIT_CRITICAL(&mux);
      currentLampOn = false;
    }

    if (currentStopAlert)
    {
      portENTER_CRITICAL(&mux);
      stopAlert       = false;
      alertActive     = false;
      alertSuppressed = true;
      portEXIT_CRITICAL(&mux);

      beepState = false;
      digitalWrite(BUZZER_PIN, LOW);
      clearAllLEDs();
      lampIsVisuallyOn = false;

      portENTER_CRITICAL(&mux);
      currentLampOn  = lampOn;
      currentApiLamp = apiLampState;
      portEXIT_CRITICAL(&mux);

      if (currentLampOn && currentApiLamp)
      {
        setAllLEDs(strip.Color(255, 255, 255));
        lampIsVisuallyOn = true;
      }

      vTaskDelay(10 / portTICK_PERIOD_MS);
      continue;
    }

    if (currentDoorOpen && !currentAlertSuppressed)
    {
      if (!currentAlertActive && now - currentDoorOpenTime > 5000)
      {
        portENTER_CRITICAL(&mux);
        alertActive    = true;
        alertStartTime = millis();
        portEXIT_CRITICAL(&mux);

        lastToggle = millis();
      }

      portENTER_CRITICAL(&mux);
      currentAlertActive = alertActive;
      unsigned long currentAlertStartTime = alertStartTime;
      portEXIT_CRITICAL(&mux);

      if (currentAlertActive)
      {
        if (now - currentAlertStartTime > 20000)
        {
          portENTER_CRITICAL(&mux);
          alertActive     = false;
          alertSuppressed = true;
          portEXIT_CRITICAL(&mux);

          beepState = false;
          digitalWrite(BUZZER_PIN, LOW);

          portENTER_CRITICAL(&mux);
          currentLampOn  = lampOn;
          currentApiLamp = apiLampState;
          portEXIT_CRITICAL(&mux);

          if (currentLampOn && currentApiLamp)
          {
            setAllLEDs(strip.Color(255, 255, 255));
            lampIsVisuallyOn = true;
          }
          else
          {
            clearAllLEDs();
            lampIsVisuallyOn = false;
          }
        }
        else if (now - lastToggle > 250)
        {
          lastToggle = now;
          beepState  = !beepState;

          digitalWrite(BUZZER_PIN, beepState && currentApiBuzzer ? HIGH : LOW);

          if (currentApiLed && beepState)
          {
            setAllLEDs(strip.Color(255, 0, 0));
            lampIsVisuallyOn = true;
          }
          else
          {
            clearAllLEDs();
            lampIsVisuallyOn = false;
          }
        }

        vTaskDelay(10 / portTICK_PERIOD_MS);
        continue;
      }
    }

    if (currentLampOn && currentApiLamp)
    {
      if (!currentMotion && now - currentLampOffTime > 10000)
      {
        portENTER_CRITICAL(&mux);
        lampOn = false;
        portEXIT_CRITICAL(&mux);

        clearAllLEDs();
        lampIsVisuallyOn = false;
      }
      else if (!lampIsVisuallyOn)
      {
        setAllLEDs(strip.Color(255, 255, 255));
        lampIsVisuallyOn = true;
      }
    }
    else if (lampIsVisuallyOn)
    {
      clearAllLEDs();
      lampIsVisuallyOn = false;
    }

    vTaskDelay(10 / portTICK_PERIOD_MS);
  }
}

void setup()
{
  Serial.begin(115200);

  pinMode(REED_PIN,   INPUT_PULLUP);
  pinMode(TRIG_PIN,   OUTPUT);
  pinMode(ECHO_PIN,   INPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  strip.begin();
  clearAllLEDs();

  WiFi.begin(ssid, password);
  Serial.print("wifi...");

  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" ok");

  doorQueue  = xQueueCreate(10, sizeof(DoorMessage));
  alertQueue = xQueueCreate(10, sizeof(AlertMessage));

  flushQueues();

  xTaskCreatePinnedToCore(sensorTask,  "SensorTask",  8192, NULL, 1, NULL, 1);
  xTaskCreatePinnedToCore(alertTask,   "AlertTask",   8192, NULL, 1, NULL, 1);
  xTaskCreatePinnedToCore(sheetTask,   "SheetTask",   8192, NULL, 1, NULL, 0);
  xTaskCreatePinnedToCore(controlTask, "ControlTask", 8192, NULL, 1, NULL, 0);
}

void loop() {}