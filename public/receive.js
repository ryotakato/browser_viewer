;(() => {

  // パスワード代わりのroom指定
  const roomId = window.prompt("Room IDを入力してください。")

  // シグナルサーバーに接続
  const socket = io('http://192.168.1.7:55555')

  socket.on('connect', () => {
    console.log('receive: connect')
    socket.emit('join', { roomId: roomId})
  });



  const video = document.getElementById('video_el')

  const pcConfig = {
    // STUNサーバーはGoogleのを使う
    //iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    // ローカルネットワークならSTUNサーバーはいらない
    iceServers:[]
  }


  function connectPeer() {
  
    // コネクションの作成
    const receivePeer = new RTCPeerConnection(pcConfig)

    // sendから受け取ったstreamをvideoタグに設定
    receivePeer.addEventListener('track', (e) => {
      if (video && video.srcObject !== e.streams[0]) {
        video.srcObject = e.streams[0]
        console.log('received remote stream', e.streams[0])
      }
    })


    // receiveにて、ICE candidateの取得ハンドラを設定
    // setRemoteDescription が完了すると ICE Candidateを取得できる
    receivePeer.addEventListener('icecandidate', e => {
      console.log('receive: icecandidate')
      if (e.candidate) {
        // IceCandidateをシグナルサーバ経由で send へ送る
        socket.emit('r2s_candidate', { candidate: e.candidate } )
      }
    })


    // sendからofferが来たら設定して、answerを返す
    socket.on('s2r_offer', async ({ offer }) => {
      console.log('receive: setRemoteDescription')
      await receivePeer.setRemoteDescription(offer)
      const answer = await receivePeer.createAnswer()
      await receivePeer.setLocalDescription(answer)
      socket.emit('r2s_answer', { answer: answer })
    })
  
    // sendからcloseがきたらコネクション切断
    socket.on('s2r_close', () => {
      if (connection) {
        video.pause()
        video.srcObject = null
        connection.close()
        connection = null
      }
    })

    // sendからcandidateが送られてきたら設定
    // もしかしたらこれ意味ない？
    socket.on('s2r_candidate', async ({ candidate }) => {
      console.log('receive: setCandidate')
      if (candidate) {
        receivePeer.addIceCandidate(candidate)
      }
    })

    // receiveからリクエストを送ることで、スタート
    socket.emit('r2s_request')
  }

  // Button イベントを設定
  const buttonReceive = document.getElementById('button_receive')
  if (buttonReceive) {
    buttonReceive.addEventListener(
      'click',
      async function(e) {
        connectPeer()
        e.preventDefault()
      },
      false
    )
  }

})()
