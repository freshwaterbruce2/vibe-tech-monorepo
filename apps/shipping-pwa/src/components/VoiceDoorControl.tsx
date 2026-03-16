import { CommandListTooltip } from '@/components/voice/CommandListTooltip'
import { VoiceCommandButton } from '@/components/voice/VoiceCommandButton'
import VoiceCommandHelp from '@/components/voice/VoiceCommandHelp'
import { VoiceFeedbackTooltip } from '@/components/voice/VoiceFeedbackTooltip'
import { useUserSettings } from '@/hooks/useUserSettings'
import { useVoiceCommand } from '@/hooks/useVoiceCommand'
import { Button } from '@vibetech/ui'
import { Mic } from 'lucide-react'
import { useEffect, useState } from 'react'
// cspell:ignore sonner
import { warehouseConfig } from '@/config/warehouse'
import { DestinationDC, FreightType, TrailerStatus } from '@/types/shipping' // Import types
import { toast } from 'sonner'

const destinationDCOptions: DestinationDC[] =
  warehouseConfig.getDestinationDCs()

// Define the type for parameters passed back from the hook
// Based on the regex groups captured
type VoiceCommandParams = Partial<{
  doorNumber: string
  destinationDC: DestinationDC
  freightType: FreightType
  trailerStatus: TrailerStatus
  tcrPresent: boolean
  palletCount: number
  isUpdate: boolean
  isRemove: boolean
}>

interface VoiceDoorControlProps {
  onAddDoor: () => void // For simple 'add door' commands
  // New callback for commands with parameter
  onAddDoorWithParams: (params: VoiceCommandParams) => void
}

const validateTrailerStatus = (value: string): value is TrailerStatus => {
  return ['empty', '25%', '50%', '75%', 'partial', 'shipload'].includes(value)
}

const VoiceDoorControl = ({
  onAddDoor,
  onAddDoorWithParams,
}: VoiceDoorControlProps) => {
  const { settings, updateSetting } = useUserSettings()
  const [handsFreeMode, setHandsFreeMode] = useState(false)

  // Enhanced door command patterns with natural language variations for warehouse use
  const doorCommandPatterns = [
    {
      // ULTRA-FAST: Complete door setup in one command - PRIORITY PATTERN
      regex:
        /(?:door|dock|bay|trailer|spot)\s+(\d{3})\s+(?:to|for|going\s+to|destination)\s+(?:dc\s+)?(\d{4})\s+(?:with|type|freight\s+type)?\s*(xd|cross\s*dock|28|twenty\s*eight|23\s*\/?\s*43|aib|air)?\s*(?:status\s+)?(empty|partial|shipload|25\s*%?|50\s*%?|75\s*%?)?/i,
      commandName: 'add complete door',
      feedback: 'Adding complete door setup',
    },
    {
      // SPEED: Door + DC only (most common)
      regex:
        /(?:door|dock|bay|trailer|spot)\s+(\d{3})\s+(?:to|for|going\s+to|destination)\s+(?:dc\s+)?(\d{4})/i,
      commandName: 'add door with dc',
      feedback: 'Adding door with DC',
    },
    {
      // SPEED: Door + Freight Type
      regex:
        /(?:door|dock|bay|trailer|spot)\s+(\d{3})\s+(?:with|type|freight\s+type)\s+(xd|cross\s*dock|cross\s*docking|28|twenty\s*eight|23\s*\/?\s*43|twenty\s*three\s*forty\s*three|aib|air|express|priority|standard)/i,
      commandName: 'add door with freight',
      feedback: 'Adding door with freight type',
    },
    {
      // SPEED: Just door number (fastest)
      regex:
        /(?:door|dock|bay|trailer|spot)\s+(?:number\s+)?(\d{3})|(?:add|new|create|setup)\s+(?:door|dock|bay|trailer|spot)\s+(\d{3})|(\d{3})\s+(?:door|dock|bay|trailer|spot)/i,
      commandName: 'add specific door',
      feedback: 'Adding door number',
    },
    {
      // Basic commands - multiple variations with warehouse terminology
      regex:
        /(?:add|new|create|start|open|begin|setup|make)\s+(?:door|dock|bay|trailer|load|spot)|(?:door|dock|bay|trailer|load|spot)(?:\s+please)?$/i,
      commandName: 'add door',
      feedback: 'Adding new door',
    },
    {
      // SPEED: Ultra-short commands for rapid entry
      regex: /^(\d{3})$/i,
      commandName: 'add specific door',
      feedback: 'Adding door',
    },
    {
      // SPEED: DC only (for quick DC assignment)
      regex: /^(?:dc\s+)?(\d{4})$/i,
      commandName: 'add dc door',
      feedback: 'Adding door for DC',
    },
    {
      // SPEED: Freight type only
      regex: /^(xd|cross\s*dock|28|23\s*\/?\s*43|aib|air)$/i,
      commandName: 'add freight door',
      feedback: 'Adding door with freight type',
    },
    {
      // Status-based commands - trailer loading status with warehouse language
      regex:
        /(empty|partial|shipload|full|loaded|twenty\s*five\s*percent|fifty\s*percent|seventy\s*five\s*percent|25\s*%?|50\s*%?|75\s*%?|quarter|half|three\s*quarters)\s+(?:door|dock|bay|trailer|load|spot)/i,
      commandName: 'add status door',
      feedback: 'Adding door with status',
    },
    {
      // Complete door setup - comprehensive command with flexible ordering
      regex:
        /(?:door|dock|bay|trailer|spot)\s+(\d{3})\s+(?:to|for|going\s+to|destination)\s+(?:dc\s+)?(\d{4})\s+(?:with|type|freight\s+type)\s+(xd|cross\s*dock|28|twenty\s*eight|23\s*\/?\s*43|aib|air)\s+(?:status\s+)?(empty|partial|shipload|25\s*%?|50\s*%?|75\s*%?)/i,
      commandName: 'add complete door',
      feedback: 'Adding complete door setup',
    },
    {
      // Quick commands for busy warehouse with urgency indicators
      regex:
        /(?:quick|fast|rush|urgent|priority|asap|immediate|now)\s+(?:door|dock|bay|trailer|spot)|(?:door|dock|bay|trailer|spot)\s+(?:quick|fast|rush|urgent|priority|asap|now)/i,
      commandName: 'quick add door',
      feedback: 'Adding priority door',
    },
    {
      // TCR commands - trailer condition report with variations
      regex:
        /(?:tcr|trailer\s+condition\s+report|condition\s+report|paperwork)\s+(present|available|yes|here|good|missing|not\s+available|no|none|absent)/i,
      commandName: 'tcr status',
      feedback: 'Updating TCR status',
    },
    {
      // Pallet count commands with warehouse terminology
      regex:
        /(?:door|dock|bay|trailer|spot)\s+(\d{3})\s+(?:has|contains|loaded\s+with|count|carrying)\s+(\d+)\s+(?:pallets?|units?|pieces?|skids?)/i,
      commandName: 'set pallet count',
      feedback: 'Setting pallet count',
    },
    {
      // Update existing door commands with warehouse language
      regex:
        /(?:update|change|modify|set|switch|move)\s+(?:door|dock|bay|trailer|spot)\s+(\d{3})\s+(?:to|for|destination)\s+(?:dc\s+)?(\d{4})/i,
      commandName: 'update door destination',
      feedback: 'Updating door destination',
    },
    {
      // Remove door commands with warehouse terminology
      regex:
        /(?:remove|delete|cancel|close|clear|finish|done\s+with)\s+(?:door|dock|bay|trailer|spot)\s+(\d{3})/i,
      commandName: 'remove door',
      feedback: 'Removing door',
    },
    {
      // Natural language variations with warehouse context
      regex:
        /(?:i\s+need|please\s+add|can\s+you\s+add|set\s+up|create|make\s+me)\s+(?:a\s+)?(?:door|dock|bay|trailer|spot|new\s+entry)/i,
      commandName: 'add door',
      feedback: 'Adding new door',
    },
    {
      // Emergency/special handling commands
      regex:
        /(?:emergency|special|hot|expedite|rush\s+order)\s+(?:door|dock|bay|trailer|spot)/i,
      commandName: 'emergency door',
      feedback: 'Adding emergency door',
    },
    {
      // Warehouse worker shortcuts
      regex: /(?:next|another|one\s+more)\s+(?:door|dock|bay|trailer|spot)/i,
      commandName: 'add door',
      feedback: 'Adding next door',
    },
    {
      // Voice command corrections and confirmations
      regex: /(?:correct|yes|confirm|that's\s+right|good)/i,
      commandName: 'confirm command',
      feedback: 'Command confirmed',
    },
    {
      // Voice command cancellations
      regex: /(?:cancel|no|stop|never\s+mind|forget\s+it|wrong)/i,
      commandName: 'cancel command',
      feedback: 'Command cancelled',
    },
  ]

  const {
    isListening,
    startListening,
    stopListening,
    transcript,
    interimTranscript,
    recentCommand,
    isProcessing,
    isFinal,
    getConfidenceColor,
    errorMessage,
  } = useVoiceCommand({
    commandPatterns: doorCommandPatterns,
    onCommandRecognized: (commandName, paramsArray) => {
      const params: VoiceCommandParams = {}

      // Handle command confirmations and cancellations
      if (commandName === 'confirm command') {
        toast.success('Command confirmed', { duration: 1500 })
        return
      }

      if (commandName === 'cancel command') {
        toast.info('Command cancelled', { duration: 1500 })
        return
      }

      // Basic command without specific parameters
      if (
        commandName === 'add door' ||
        commandName === 'quick add door' ||
        commandName === 'emergency door'
      ) {
        onAddDoor() // Call original handler for simple add
        return
      }

      // --- Enhanced Parameter Parsing Logic for Warehouse Commands ---
      if (paramsArray && paramsArray.length > 0) {
        switch (commandName) {
          case 'add specific door': {
            // Enhanced door number parsing - prioritize speed
            const doorNum = paramsArray[0] || paramsArray[1] || paramsArray[2]

            // Validate door number is 3 digits
            if (doorNum && /^\d{3}$/.test(doorNum)) {
              params.doorNumber = doorNum
            } else {
              console.warn(`Invalid door number format: ${doorNum}`)
            }
            break
          }

          case 'add complete door':
            // Parse all parameters from complete command
            if (paramsArray[0] && /^\d{3}$/.test(paramsArray[0])) {
              params.doorNumber = paramsArray[0]
            }
            if (paramsArray[1] && /^\d{4}$/.test(paramsArray[1])) {
              params.destinationDC = paramsArray[1] as DestinationDC
            }
            if (paramsArray[2]) {
              const freight = paramsArray[2].toLowerCase()
              if (freight.includes('xd') || freight.includes('cross')) {
                params.freightType = 'XD'
              } else if (freight.includes('28') || freight.includes('twenty')) {
                params.freightType = '28'
              } else if (freight.includes('23') || freight.includes('43')) {
                params.freightType = '23/43'
              } else if (freight.includes('aib') || freight.includes('air')) {
                params.freightType = 'AIB'
              }
            }
            if (paramsArray[3]) {
              const status = paramsArray[3].toLowerCase()
              if (status.includes('empty')) params.trailerStatus = 'empty'
              else if (status.includes('partial'))
                params.trailerStatus = 'partial'
              else if (status.includes('shipload') || status.includes('full'))
                params.trailerStatus = 'shipload'
              else if (status.includes('25')) params.trailerStatus = '25%'
              else if (status.includes('50')) params.trailerStatus = '50%'
              else if (status.includes('75')) params.trailerStatus = '75%'
            }
            break

          case 'add door with dc':
            if (paramsArray[0] && /^\d{3}$/.test(paramsArray[0])) {
              params.doorNumber = paramsArray[0]
            }
            if (paramsArray[1] && /^\d{4}$/.test(paramsArray[1])) {
              params.destinationDC = paramsArray[1] as DestinationDC
            }
            break

          case 'add door with freight':
            if (paramsArray[0] && /^\d{3}$/.test(paramsArray[0])) {
              params.doorNumber = paramsArray[0]
            }
            if (paramsArray[1]) {
              const freight = paramsArray[1].toLowerCase()
              if (freight.includes('xd') || freight.includes('cross')) {
                params.freightType = 'XD'
              } else if (freight.includes('28')) {
                params.freightType = '28'
              } else if (freight.includes('23') || freight.includes('43')) {
                params.freightType = '23/43'
              } else if (freight.includes('aib') || freight.includes('air')) {
                params.freightType = 'AIB'
              }
            }
            break
          case 'add dc door': {
            // Handle multiple capture groups for DC number
            const dcNum = paramsArray[0] || paramsArray[1]
            if (
              dcNum &&
              destinationDCOptions.includes(dcNum as DestinationDC)
            ) {
              params.destinationDC = dcNum as DestinationDC
            } else {
              console.warn(`Invalid DC value: ${dcNum}`)
            }
            break
          }
          case 'add status door': {
            // Enhanced status parsing with warehouse terminology
            const status = paramsArray[0]
              ?.toLowerCase()
              .replace(/\s+/g, ' ')
              .trim()

            // Convert natural language and phonetic variations to system values
            const statusMappings: Record<string, TrailerStatus> = {
              empty: 'empty',
              partial: 'partial',
              shipload: 'shipload',
              full: 'shipload',
              loaded: 'shipload',
              'twenty five percent': '25%',
              twentyfivepercent: '25%',
              '25%': '25%',
              '25 %': '25%',
              '25 percent': '25%',
              quarter: '25%',
              'fifty percent': '50%',
              fiftypercent: '50%',
              '50%': '50%',
              '50 %': '50%',
              '50 percent': '50%',
              half: '50%',
              'seventy five percent': '75%',
              seventyfivepercent: '75%',
              '75%': '75%',
              '75 %': '75%',
              '75 percent': '75%',
              'three quarters': '75%',
            }

            const mappedStatus = status ? statusMappings[status] : undefined
            if (mappedStatus) {
              params.trailerStatus = mappedStatus
            } else {
              console.warn(`Invalid status value: ${status}`)
            }
            break
          }
          case 'add freight door': {
            // Enhanced freight type parsing with warehouse terminology
            const freight = paramsArray[0]
              ?.toLowerCase()
              .replace(/\s+/g, ' ')
              .trim()

            // Convert natural language and phonetic variations to system values
            const freightMappings: Record<string, FreightType> = {
              'cross dock': 'XD',
              crossdock: 'XD',
              'cross docking': 'XD',
              crossdocking: 'XD',
              xd: 'XD',
              'twenty eight': '28',
              twentyeight: '28',
              '28': '28',
              'twenty three forty three': '23/43',
              'twenty three / forty three': '23/43',
              twentythreefortythree: '23/43',
              '23/43': '23/43',
              '23 43': '23/43',
              air: 'AIB',
              aib: 'AIB',
              express: 'AIB',
              priority: 'AIB',
              standard: '23/43',
            }

            const mappedFreight = freight ? freightMappings[freight] : undefined
            if (mappedFreight) {
              params.freightType = mappedFreight
            } else {
              console.warn(`Invalid freight type: ${freight}`)
            }
            break
          }
          case 'tcr status': {
            const tcrStatus = paramsArray[0]?.toLowerCase()
            if (
              tcrStatus &&
              ['present', 'available', 'yes'].includes(tcrStatus)
            ) {
              params.tcrPresent = true
            } else if (
              tcrStatus &&
              ['not available', 'missing', 'no'].includes(tcrStatus)
            ) {
              params.tcrPresent = false
            }
            break
          }
          case 'set pallet count': {
            const doorNumber = paramsArray[0]
            const palletCount = paramsArray[1] ? parseInt(paramsArray[1]) : NaN
            if (doorNumber && !isNaN(palletCount)) {
              params.doorNumber = doorNumber
              params.palletCount = palletCount
            }
            break
          }
          case 'update door destination': {
            const doorNumber = paramsArray[0]
            const dcNumber = paramsArray[1]
            if (
              doorNumber &&
              dcNumber &&
              destinationDCOptions.includes(dcNumber as DestinationDC)
            ) {
              params.doorNumber = doorNumber
              params.destinationDC = dcNumber as DestinationDC
              params.isUpdate = true
            }
            break
          }
          case 'remove door': {
            const doorNumber = paramsArray[0]
            if (doorNumber) {
              params.doorNumber = doorNumber
              params.isRemove = true
            }
            break
          }
          case 'set trailer status':
            if (
              paramsArray[0] &&
              validateTrailerStatus(paramsArray[0].toLowerCase())
            ) {
              params.trailerStatus =
                paramsArray[0].toLowerCase() as TrailerStatus
            }
            break
          default:
            console.warn(`Unhandled command with params: ${commandName}`)
            onAddDoor() // Fallback to simple add if params can't be parsed
            return
        }
      }

      // If we parsed any params, call the specific handler
      if (Object.keys(params).length > 0) {
        onAddDoorWithParams(params)
      } else {
        console.warn(
          `Command ${commandName} recognized but no parameters parsed. Falling back.`
        )
        onAddDoor() // Fallback if no params were extracted despite command type
      }
    },
    // Revert speakBackText to a simple static string based on settings
    speakBackText: settings.voiceFeedback ? 'Okay' : undefined,
  })

  // Toggle hands-free mode with enhanced feedback
  const toggleHandsFreeMode = () => {
    const newMode = !handsFreeMode
    setHandsFreeMode(newMode)

    if (newMode) {
      startListening()
      toast.success('Hands-free voice mode activated', {
        description:
          "Voice recognition will stay active. Say 'Add Door' to begin.",
        duration: 3000,
      })
    } else if (isListening) {
      stopListening()
      toast.info('Hands-free mode disabled')
    }

    updateSetting('voiceActivationMode', newMode ? 'continuous' : 'button')
  }

  // Effect to handle hotword activation
  // cspell:ignore hotword
  useEffect(() => {
    if (settings.voiceActivationMode === 'hotword' && !isListening) {
      startListening()
    }
  }, [settings.voiceActivationMode, isListening, startListening])

  // Enhanced visual feedback for voice states
  const getStatusColor = () => {
    if (errorMessage) return 'text-red-500'
    if (isProcessing) return 'text-yellow-500'
    if (isListening) return 'text-green-500'
    return 'text-neutral-600'
  }

  // Helper function to determine tooltip help text
  const getHelpText = (): string => {
    if (errorMessage) {
      return errorMessage
    }
    if (settings.voiceActivationMode === 'hotword') {
      return 'Say "Add Door" to begin'
    }
    if (handsFreeMode) {
      return 'Hands-free mode active'
    }
    return 'Say "Add Door" or "New Door"'
  }

  if (!settings.voiceRecognitionEnabled) {
    return null
  }

  const validCommands = [
    // Basic Commands - Enhanced for warehouse
    'Add door / New door / Create door / Setup door',
    'Door / Dock / Bay / Trailer / Spot',
    'Quick door / Rush door / Priority door / Emergency door',
    'Next door / Another door / One more door',

    // Specific Door Commands - With phonetic support
    'Door number 332 / Door 332 / 332 door',
    'Add trailer 335 / Setup spot 340',
    'Three thirty two / 3 32',

    // Destination Commands - Enhanced warehouse language
    'Door to DC 6024 / Door for DC 6070',
    'Trailer going to 6039 / Ship to DC 6040',
    'Distribution center 7045',

    // Freight Type Commands - Warehouse terminology
    'Door for XD / Cross dock / Cross docking',
    'Door with 28 / Twenty eight freight',
    'Door type 23/43 / Twenty three forty three',
    'AIB door / Air freight / Express / Priority',
    'Standard freight',

    // Status Commands - Warehouse language
    'Empty door / Empty trailer / Empty load',
    'Partial door / Partial trailer / Partial load',
    'Shipload door / Full trailer / Loaded trailer',
    '25% door / Quarter load / Twenty five percent',
    '50% door / Half load / Fifty percent',
    '75% door / Three quarters / Seventy five percent',

    // Complete Setup - Comprehensive commands
    'Door 332 to DC 6024 with XD empty',
    'Trailer 335 for 6070 cross dock partial',

    // Management Commands - Enhanced warehouse operations
    'Update door 332 to DC 6070',
    'Change trailer 335 destination 6039',
    'Remove door 332 / Cancel door 335',
    'Close trailer 340 / Finish door 345',
    'Door 332 has 25 pallets / Trailer loaded with 30 units',

    // TCR Commands - Paperwork management
    'TCR present / TCR available / Paperwork here',
    'TCR missing / TCR not available / No paperwork',

    // Natural Language - Warehouse context
    'I need a door / Please add a trailer',
    'Can you add a spot / Set up a new door',
    'Make me a door / Create new entry',

    // Voice Control Commands
    "Correct / Yes / Confirm / That's right",
    'Cancel / No / Stop / Never mind / Wrong',
  ]

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <VoiceCommandButton
          isListening={isListening}
          onToggle={() => {
            if (isListening) {
              stopListening()
            } else {
              startListening()
            }
          }}
          label={
            settings.voiceActivationMode === 'hotword'
              ? 'Say "Add Door"'
              : 'Voice Command'
          }
          stopLabel="Stop Voice"
          className={`ml-2 ${getStatusColor()}`}
        />

        <div className="flex items-center gap-1 ml-1">
          <VoiceCommandHelp commandType="door" />

          <Button
            variant="ghost"
            size="icon"
            className={`h-9 w-9 rounded-full ${
              handsFreeMode ? 'bg-red-50 text-red-500' : 'text-neutral-600'
            }`}
            onClick={() => {
              toggleHandsFreeMode()
            }}
            title={
              handsFreeMode
                ? 'Disable hands-free mode'
                : 'Enable hands-free mode'
            }
          >
            <Mic className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <VoiceFeedbackTooltip
        isListening={isListening}
        isProcessing={isProcessing}
        interimTranscript={interimTranscript}
        transcript={transcript}
        isFinal={isFinal}
        recentCommand={recentCommand}
        getConfidenceColor={getConfidenceColor}
        helpText={getHelpText()}
      />

      <CommandListTooltip
        isListening={isListening}
        commandList={validCommands}
      />
    </div>
  )
}

export default VoiceDoorControl
