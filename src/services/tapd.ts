// Defines the unified data structure for items fetched from TAPD.
export interface TapdItem {
  id: string
  type: 'bug' | 'story'
  name: string
  status: string
  owner: string
  v_status: string
  gamified_status: string // The gamified status text
  is_claimable: boolean // True if the task is ready to be claimed for rewards
}

// --- Gamification Logic ---

/**
 * Translates a standard TAPD status into a more thematic, gamified version.
 * @param status The original status string from TAPD.
 * @returns The gamified status string.
 */
function gamifyStatus(status: string): string {
  switch (status) {
    case '预审通过':
      return '📖预审通过'
    case '方案中':
      return '📘方案中'
    
    case '排期中':
      return '🧭排期中'
    case '开发中':
      return '🔧开发中'
    case '已提测':
      return '✅已提测'
    case '测试中':
      return '🔬测试中'
    case '已测完':
      return '✅已测完'
    default:
      return status // Fallback to the original status if no match is found
  }
}

// --- Real API Implementation ---

const API_BASE_URL = 'https://api.tapd.cn'

/**
 * Fetches the user's assigned bugs and stories from the live TAPD API.
 * @returns A promise that resolves to a list of TapdItems.
 */
export async function fetchMyTapdData(): Promise<TapdItem[]> {
  const { token, workspaceId, userName = '', userRoleField } = await window.secureStoreApi.getTapdConfig()

  if (!token) {
    console.warn('TAPD token not set. Skipping API fetch.')
    return [] // Return empty array if no token is configured
  }

  // Log a masked version of the token for debugging purposes
  const maskedToken = `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
  console.log(`[useTapd] Using token: ${maskedToken}`);

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  try {
    // Helper to make requests via IPC
    async function ipcFetch(url: string, options: any) {
      const result = await window.ipcRenderer.invoke('fetch-tapd', url, options)
      if (result.error) {
        throw new Error(result.error)
      }
      return result.data
    }

    const fields = 'id,name,status,owner,v_status'
    const statusesToFetch = [
      '方案中',
      '预审通过',
      '待正式评审',
      '技术方案中',
      '排期中',
      '开发中',
      '已提测',
      '测试中',
      '已测完'
    ].join('|')
    
    // Determine claimable statuses based on role
    let localClaimableStatuses: string[] = []
    
    if (userRoleField === 'custom_field_9') {
      // Product Manager
      localClaimableStatuses = ['排期中', '开发中', '已提测', '测试中', '已测完']
    } else if (userRoleField === 'custom_field_10') {
      // Tester
      localClaimableStatuses = ['已测完']
    } else {
      // Developer (default)
      localClaimableStatuses = ['已提测', '测试中','已测完']
    }

    const ownerParam = userName && userRoleField ? `&${userRoleField}=${userName}` : ''

    console.log(ownerParam, 'ownerParam');

    let storyUrl = `${API_BASE_URL}/stories?limit=50&with_v_status=1${ownerParam}&fields=${fields}&v_status=${statusesToFetch}`

    if (workspaceId) {
      storyUrl += `&workspace_id=${workspaceId}`
    }

    const storyData = await ipcFetch(storyUrl, { headers })
    // Map the raw data to our unified TapdItem structure
    const stories: TapdItem[] = storyData.data.map((item: any) => {
      const story = item.Story
      return {
        ...story,
        gamified_status: gamifyStatus(story.v_status),
        is_claimable: localClaimableStatuses.includes(story.v_status),
      }
    })

    // Sort stories: claimable ones first, then by status order
    const statusOrder = ['已提测', '测试中','已测完', '开发中', '排期中','待正式评审','技术方案中', '预审通过', '方案中',]
    stories.sort((a, b) => {
      if (a.is_claimable && !b.is_claimable) return -1
      if (!a.is_claimable && b.is_claimable) return 1
      return statusOrder.indexOf(a.v_status) - statusOrder.indexOf(b.v_status)
    })

    return stories
  } catch (error) {
    console.error('Error fetching from TAPD API via main process:', error)
    // Re-throw the error so the UI layer can handle it and display a message.
    throw error
  }
}
