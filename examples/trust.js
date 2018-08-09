console.clear();

// Please Note: this code is horrendous.

if(window.location.href !== "https://ncase.me/trust/") {
    window.location.href = "https://ncase.me/trust/";
    throw new Error('Must be on "https://ncase.me/trust/" to play');
}

window.slideIndex = SLIDES.length;
window.server = window.server || 'ws://127.0.0.1:34777';

if(window.game) {
    game.setStatus('');
    game.close();
}
function NexusGame() {
    const self = {};
    let socket;

    let playerMove;
    let enemyMove;

    self.isDone = false;

    self.status = ''; // displayed to user
    self.statusObj = null;
    self.initStatus = function(obj) {
        self.statusObj = obj;
        self.setStatus(self.status);
    };
    self.setStatus = function(text) {
        if(self.statusObj) {
            self.statusObj.setText(text);

            if(text) {
                if(!self.status) {
                    _fadeIn(self.statusObj, 150);
                }
            } else {
                _hide(self.statusObj);
            }
        }

        self.status = text;
    };
    self.close = function() {
        socket.close();
    };
    self.start = function() {
        publish("slideshow/scratch", ['nexus-lobby']);
    };
    self.end = function() {
        self.isDone = true;
    }
    self.initSocket = function() {
        if(!window.Nexus) {
            game.setStatus('Failed to load networking code :(');
            throw new Error('ws-nexus-user.js has not been loaded');
        }
        socket = Nexus(server).joinOrHost({
            name: 'Evolution of Trust',
            maxClients: 1,
            status: 'Open',
        });
        socket.whenServerConnected.onError(() => {
            game.setStatus(`WS-Nexus connection failed (${server})`);
        });
        socket.whenJoined.then(() => {
            publish("slideshow/next");
        });
        socket.whenHosting.then(() => {
            game.setStatus('Waiting for another player...');
            socket.onNewClient.then(() => {
                socket.update({ status: 'Playing', maxClients:0 });
                publish("slideshow/next");
            });
            socket.onLostClient.then(() => {
                enemy.hide();
                if(!self.isDone) {
                    game.setStatus("The other player left :(");
                }
            });
        });
        socket.onMessage(move => {
            if(typeof move !== 'string') {
                console.error('Enemy did not send a string');
                return;
            }
            if(move == 'cheat') {
                enemy.cheat();
            } else if(move == 'cooperate') {
                enemy.coop();
            } else {
                console.error('Enemy tried to make an invalid move');
            }
        });
        socket.onClose.then(() => {
            enemy.hide();
            if(!self.isDone) {
                game.setStatus("The other player left :(");
            }
        });
    };
    self.playMoves = function() {
        if(playerMove && enemyMove) {
            publish("iterated/"+playerMove);
            playerMove = null;
            enemyMove = null;
        }
    }
    self.playerMove = function(move='cooperate') {
        if(typeof move !== 'string') {
            console.error('Player cannot make move that is not a string');
            return;
        }
        if(move!=='cooperate' && move!=='cheat' && move!=='TRIP') {
            console.error('Player cannot make move: ', move);
            return;
        }
        if(playerMove) {
            console.warn('Player cannot make a different move: ', move);
            return;
        }

        if(0 === (Math.floor(Math.random() * 10))) {
            playerMove = 'TRIP';
            socket.send('cheat');
        } else {
            playerMove = move;
            socket.send(move);
        }

        self.playMoves();
    };
    self.enemyMove = function(move) {
        if(typeof move !== 'string') {
            console.error('Enemy cannot make move that is not a string');
            return;
        }
        if(move!=='cooperate' && move!=='cheat') {
            console.error('Enemy cannot make move: ', move);
            return;
        }
        if(enemyMove) {
            console.warn('Enemy cannot make a different move: ', move);
            return;
        }
        enemyMove = move;
        self.playMoves();
    }

    return self;
}
game = NexusGame();

// Load network code
if(window.nexusScriptLoading) {
    // if this script was run again
    game.start();
} else {
    const s = document.createElement('script');
    s.setAttribute("integrity", "sha384-6OE83fg6+Q1TCg+85xEQX1QWQiPEeQPpD3sEh4PuUrMn/Rz1dDCIXLPLlMmuN8qC");
    s.setAttribute("src", "https://cdn.jsdelivr.net/gh/JasonSteck/WS-Nexus@1.2.1/ws-nexus-user.js");
    s.setAttribute("crossorigin", "anonymous");
    s.onload = () => game.start();

    document.head.appendChild(s);
    window.nexusScriptLoading = true;
}

SLIDES.set = function(obj) {
    if(obj.id) {
        slideIndex = SLIDES.findIndex(s => s.id == obj.id);
        if(slideIndex < 0) slideIndex = SLIDES.length;
    } else {
        slideIndex++;
    }

    SLIDES[slideIndex] = obj;
}

SLIDES.set({

	id: "nexus-lobby",

	onjump: function(self){

		Tournament.resetGlobalVariables();

		// Iterated Simulation
		self.add({id:"iterated", type:"Iterated", x:130, y:183});
		self.objects.iterated.dehighlightPayoff();

		self.add({
			id:"btmWords", type:"TextBox", text_id:"iterated_intro_btm",
			x:130, y:460, width:700, height:100, align:"center"
		});
		game.initStatus(self.objects.btmWords);

        publish("iterated/newOpponent",['nexus']);

        enemy.initCover();

        setTimeout(game.initSocket, 1000);
	},

	onstart: function(self){},

	onend: function(self){}

});

SLIDES.set({ // first round

	onjump: function(self){

		Tournament.resetGlobalVariables();

		// Iterated Simulation
		self.object.iterated.dehighlightPayoff();
	},

	onstart: function(self){

		var o = self.objects;

		o.iterated.introMachine(); // RING RING RING!

		enemy.show();

		// Labels
		self.add({
			id:"labelYou", type:"TextBox",
			x:211, y:251, width:50, height:50,
			align:"center", color:"#aaa", size:17,
			text_id:"label_you"
		});
		self.add({
			id:"labelThem", type:"TextBox",
			x:702, y:239, width:50, height:50,
			align:"center", color:"#aaa", size:17,
			text_id:"label_them"
		});

// 		self.add({
// 			id:"topWords", type:"TextBox", text_id:"iterated_intro_top",
// 			x:130, y:10, width:700, height:100, align:"center"
// 		});

		game.setStatus("Pick your first, <i>real</i> move. <b>Choose wisely.</b>");

		// Buttons
		self.add({
			id:"buttonCheat", type:"Button", x:275, y:503, uppercase:true,
			text_id:"label_cheat",
			onclick:function(){
				game.playerMove('cheat');
                publish("buttonCheat/deactivate");
                publish("buttonCooperate/deactivate");
				publish("slideshow/next");
			}
		});
		self.add({
			id:"buttonCooperate", type:"Button", x:495, y:500, uppercase:true,
			text_id:"label_cooperate",
			onclick:function(){
				game.playerMove('cooperate');
                publish("buttonCheat/deactivate");
                publish("buttonCooperate/deactivate");
				publish("slideshow/next");
			}
		});

		// Scoreboard!
		self.add({id:"scoreboard", type:"IteratedScoreboard", x:378, y:85});

		// Extra info up top
		self.add({
			id:"info", type:"TextBox",
			x:378, y:45, width:200, height:50, align:"center", size:15
		});

        _.ROUND_NUM = 1;
		_.showInfo = function(text=null){
			var infoWords = text || "<br/>Round `ROUND`";
			infoWords = infoWords.replace(/`ROUND`/g, (_.ROUND_NUM)+"");
			self.objects.info.setText(infoWords);
		};
		_.showInfo();

		_hide(o.scoreboard); _fadeIn(o.scoreboard,10);
		_hide(o.info); _fadeIn(o.info,10);

		// Hide & fade
		_hide(o.btmWords); _fadeIn(o.btmWords, 150+600);
		_hide(o.buttonCheat); _fadeIn(o.buttonCheat, 150+1200);
		_hide(o.buttonCooperate); _fadeIn(o.buttonCooperate, 150+1200);

	},
	onend: function(self){}

});

SLIDES.set({  // Subsequent rounds

	onstart: function(self){
		game.setStatus(null);
		self.remove("labelYou");
		self.remove("labelThem");

		var o = self.objects;

		//////////////////////////

		// CHANGE THE BUTTONS BACK
		setTimeout(function(){
			o.buttonCheat.config.onclick = function(){
				game.playerMove('cheat');
                publish("buttonCheat/deactivate");
                publish("buttonCooperate/deactivate");
			};
			o.buttonCooperate.config.onclick = function(){
				game.playerMove('cooperate');
                publish("buttonCheat/deactivate");
                publish("buttonCooperate/deactivate");
			};
		},1);

		//////////////////////////

		listen(self, "iterated/round/start", function(){
			publish("buttonCheat/deactivate");
			publish("buttonCooperate/deactivate");
		});

		listen(self, "iterated/round/end", function(payoffA, payoffB){
			// Add score!
			self.objects.scoreboard.addScore(payoffA, payoffB);

			// Next round
			_.ROUND_NUM++;

			if(_.ROUND_NUM > 7) {
                _.showInfo('<br/>Game Over');
                const you = self.objects.scoreboard.score[0];
                const them = self.objects.scoreboard.score[1];
                if(you > them) {
                    game.setStatus('You Win!');
                } else if(them > you) {
                    game.setStatus('They Won :(');
                } else {
                    game.setStatus('You both Win!!');
                }
                game.end();
                self.remove("buttonCheat");
                self.remove("buttonCooperate");
			} else {
			    _.showInfo();
                publish("buttonCheat/activate");
                publish("buttonCooperate/activate");
			}
		});
	},

	onend: function(self){
		unlisten(self);
		self.clear();
	}

});

function Enemy() {
  let move = PD.COOPERATE;
  let shouldHide = true;
  const self = {
    hide() {
      if(enemy.scratcher) {
        Scratcher.scratchAnim(enemy.scratcher, true);
      } else {
        shouldHide = true;
      }
    },

    show() {
      if(enemy.scratcher) {
        Scratcher.scratchAnim(enemy.scratcher, false);
      } else {
        shouldHide = false;
      }
    },

    cheat() {
      move = PD.CHEAT;
      game.enemyMove('cheat');
    },

    coop() {
      move = PD.COOPERATE;
      game.enemyMove('cooperate');
    },

    play() {
      return move;
    },

    remember(own, other) {},

    initCover() {
      var scratcher = document.createElement("div");
      scratcher.style.left = 700+"px";
      scratcher.style.top = 260+"px";
      scratcher.style.width = 150+"px";
      scratcher.style.height = 162+"px";
      scratcher.className = "scratcher";
      scratcher.style.display = "block";
      slideshow.dom.appendChild(scratcher);

      enemy.scratcher = scratcher;
      if(shouldHide) {
          enemy.hide();
      } else {
          enemy.show();
      }
    }
  };
  return self;
}
window.enemy = Enemy();

window.Logic_nexus = function() {
  var self = this;
  self.play = enemy.play;
  self.remember = enemy.remember;
}
PEEP_METADATA.nexus = {frame:0, color:"#ddd"};

null;
