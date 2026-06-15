var auth = require('../../utils/auth')

function svgToDataUri(svg) {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

function buildSvgIcon(type, color) {
  var stroke = color
  var fillNone = 'fill="none" stroke="' + stroke + '" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"'
  var petStroke = 'fill="none" stroke="' + stroke + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"'
  var svg = ''

  if (type === 'community') {
    svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
      '<path ' + fillNone + ' d="M4.5 10.5 12 4l7.5 6.5"/>' +
      '<path ' + fillNone + ' d="M6.5 9.5V19h11V9.5"/>' +
      '<path ' + fillNone + ' d="M10 19v-4.5h4V19"/>' +
      '</svg>'
  } else if (type === 'diary') {
    svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">' +
      '<path fill="' + stroke + '" d="M179.2512 423.8336h76.4928a34.7648 34.7648 0 0 0 0-69.5296H179.2512a34.7648 34.7648 0 0 0 0 69.5296z"/>' +
      '<path fill="' + stroke + '" d="M770.1504 127.0784H292.7616c-47.8208 0-86.5792 38.7584-86.5792 86.5792v99.328h49.6128c42.0352 0 76.0832 34.048 76.0832 76.0832 0 42.0352-34.048 76.0832-76.0832 76.0832h-49.6128v125.3376h49.6128c42.0352 0 76.0832 34.048 76.0832 76.0832s-34.048 76.0832-76.0832 76.0832h-49.6128v79.3088c0 47.8208 38.7584 86.5792 86.5792 86.5792h477.3888c47.8208 0 86.5792-38.7584 86.5792-86.5792V213.6576c0.0512-47.8208-38.7584-86.5792-86.5792-86.5792z m-91.3408 618.0864H384a38.4 38.4 0 0 1 0-76.8h294.8096a38.4 38.4 0 0 1 0 76.8z m0-151.6032H384a38.4 38.4 0 0 1 0-76.8h294.8096a38.4 38.4 0 0 1 0 76.8z m0-151.552H384a38.4 38.4 0 0 1 0-76.8h294.8096a38.4 38.4 0 0 1 0 76.8z"/>' +
      '<path fill="' + stroke + '" d="M290.56 666.624a34.7648 34.7648 0 0 0-34.7648-34.7648H179.2512a34.7648 34.7648 0 0 0 0 69.5296h76.4928c19.2512 0 34.816-15.5648 34.816-34.7648z"/>' +
      '</svg>'
  } else if (type === 'identify') {
    svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
      '<rect x="4.5" y="7" width="15" height="11.5" rx="2.6" ' + fillNone + '/>' +
      '<path ' + fillNone + ' d="M8 7l1.2-2h5.6L16 7"/>' +
      '<circle cx="12" cy="12.7" r="3.2" ' + fillNone + '/>' +
      '<path ' + fillNone + ' d="M17.5 10.2h.01"/>' +
      '</svg>'
  } else if (type === 'calendar') {
    svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
      '<rect x="4.5" y="6" width="15" height="13.5" rx="2.2" ' + fillNone + '/>' +
      '<path ' + fillNone + ' d="M8 4.5v3M16 4.5v3M4.5 9.2h15"/>' +
      '<path ' + fillNone + ' d="M8.2 12.3h.01M12 12.3h.01M15.8 12.3h.01M8.2 15.8h.01M12 15.8h.01M15.8 15.8h.01"/>' +
      '</svg>'
  } else if (type === 'consult') {
    svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
      '<path ' + fillNone + ' d="M6.5 5.5h11a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z"/>' +
      '<path ' + fillNone + ' d="M9.5 10.2h5M12 7.8v4.8"/>' +
      '<path ' + fillNone + ' d="M8.5 14.8h7"/>' +
      '</svg>'
  } else {
    svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">' +
      '<path fill="' + stroke + '" d="M510.350222 418.332444c96.597333-0.853333 199.480889 83.996444 308.679111 254.577778a172.032 172.032 0 0 1-32.170666 222.72l-26.680889 23.096889a137.528889 137.528889 0 0 1-168.675556 8.96l-6.371555-4.437333a142.222222 142.222222 0 0 0-162.816 0.170666l-9.898667 6.940445A138.410667 138.410667 0 0 1 239.217778 918.755556l-18.716445-17.265778a169.472 169.472 0 0 1-27.733333-216.234667c113.777778-177.095111 219.619556-266.069333 317.553778-266.922667z m143.331556-7.68c-92.273778-16.241778-112.355556-96.398222-90.680889-179.114666 21.731556-82.744889 81.009778-148.878222 146.488889-137.329778 65.479111 11.548444 100.608 78.336 90.652444 179.143111-9.955556 100.778667-54.215111 153.6-146.488889 137.301333z m-270.990222-3.584c-92.842667 13.084444-140.828444-51.854222-140.828445-137.016888 0-85.191111 31.772444-161.28 97.592889-170.552889 65.848889-9.272889 117.902222 53.930667 140.856889 137.016889 22.926222 83.114667-4.750222 157.525333-97.621333 170.552888z m462.592 162.986667c-65.905778-39.082667-71.168-105.784889-35.498667-153.258667 35.669333-47.473778 97.678222-75.832889 148.764444-51.114666 51.143111 24.718222 63.772444 100.323556 35.498667 153.258666-28.245333 52.935111-82.858667 90.225778-148.764444 51.143112z m-613.12-2.446222c-49.237333 49.237333-118.812444 39.822222-157.098667-8.135111-38.314667-47.985778-44.942222-121.059556-8.135111-157.127111 36.778667-36.039111 105.130667-39.594667 157.098666 8.135111 51.996444 47.729778 57.400889 107.861333 8.135112 157.127111z"/>' +
      '</svg>'
  }

  return svgToDataUri(svg)
}

function createItem(key, text, url) {
  return {
    key: key,
    text: text,
    url: url,
    icon: buildSvgIcon(key, '#A3927D'),
    activeIcon: buildSvgIcon(key, '#7F956D')
  }
}

Component({
  properties: {
    current: {
      type: String,
      value: 'community'
    }
  },

  data: {
    leftItems: [
      createItem('community', '社区', '/pages/forum/index'),
      createItem('consult', '问诊', '/pages/consult/index')
    ],
    centerItem: {
      key: 'identify',
      text: '识别',
      url: '/pages/identify/index',
      icon: buildSvgIcon('identify', '#FFFFFF'),
      activeIcon: buildSvgIcon('identify', '#FFFFFF'),
      isCenter: true
    },
    rightItems: [
      createItem('calendar', '日历', '/pages/calendar/index'),
      createItem('pet', '档案', '/pages/pet/index')
    ]
  },

  methods: {
    goPage: function (e) {
      var key = e.currentTarget.dataset.key
      var url = e.currentTarget.dataset.url

      if (!auth.ensureValidAuth()) {
        wx.reLaunch({
          url: '/pages/login/index'
        })
        return
      }

      if (key === this.data.current) {
        return
      }

      wx.redirectTo({
        url: url
      })
    }
  }
})
