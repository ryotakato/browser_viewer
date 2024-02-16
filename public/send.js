;(async () => {

  // パスワード代わりのroom指定
  const roomId = window.prompt("Room IDを入力してください。")

  // シグナルサーバーに接続
  const socket = io('http://localhost:55555')

  // ソケットサーバー疎通確認
  socket.on('connect', () => {
    console.log('send : connect')
    socket.emit('join', { roomId: roomId})
  })

  //const MEDIA_CONFIG = { video: true, audio: true }
  const video = document.getElementById('video_el')

  const pcConfig = {
    // STUNサーバーはGoogleのを使う
    //iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    // ローカルネットワークならSTUNサーバーはいらない
    iceServers:[]
  }


  async function setupDisplayMedia() {
    try {
      // 音声も送るためにstreamを組み合わせる
      //const stream = await navigator.mediaDevices.getDisplayMedia(MEDIA_CONFIG)
      const displayStream = await navigator.mediaDevices.getDisplayMedia({video: true})
      const [displayVideoTrack] = displayStream.getVideoTracks()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      const [userAudioTrack] = stream.getAudioTracks()
      const newStream = new MediaStream([displayVideoTrack, userAudioTrack])
      return newStream
    } catch (err) {
      console.log('An error occured! ' + err)
    }
  }
  
  function showVideo(stream) {
    video.srcObject = stream
  }



  async function connectPeer() {

    const stream = await setupDisplayMedia()
    if (stream) {
      // パフォーマンスのために自画面には映さない
      //showVideo(stream)
    }

    
    // コネクションの作成
    const sendPeer = new RTCPeerConnection(pcConfig)

    if (stream) {
      stream.getTracks().forEach(track => {
        sendPeer.addTrack(track, stream)
      })
    }

    // receiveからリクエストを受けたら、コネクションを作成してofferを渡す
    socket.on('r2s_request', async ({ cid }) => {
      const offer = await sendPeer.createOffer()
      await sendPeer.setLocalDescription(offer)
      console.log('send: offer')
      socket.emit('s2r_offer', { offer: offer, cid })
    })

    // receiveからoffer送信後の返答が返ってきたらanswerを設定
    socket.on('r2s_answer', async ({ cid, answer }) => {
      console.log('send: setAnswer')
      //console.log(answer)
      sendPeer.setRemoteDescription(answer)
    })

    // receiveからcandidateが送られてきたら設定
    socket.on('r2s_candidate', async ({ candidate }) => {
      console.log('send: setCandidate')
      if (candidate) {
        sendPeer.addIceCandidate(candidate)
      }
    })

  }

  
  
  
  // Button イベントを設定
  const buttonBroadcast = document.getElementById('button_broadcast')
  if (buttonBroadcast) {
    buttonBroadcast.addEventListener(
      'click',
      async function(e) {
        connectPeer()
        e.preventDefault()
      },
      false
    )
  }
})()
