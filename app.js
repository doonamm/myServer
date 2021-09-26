const mongojs = require('mongojs');
const db = mongojs('localhost:27017/myGame', ['account', 'progress']);

const express = require('express');
const app = express();
const server = require('http').Server(app);

app.get('/', function(req, res){
    res.sendFile(__dirname + '/client/index.html');
}); 
app.use('client', express.static(__dirname + '/client'));

server.listen(process.env.PORT || 2000);
console.log('Server started');

const SOCKET_LIST = {};

const Entity = function(){
    const self = {
        x: 250,
        y: 250,
        spX: 0,
        spY: 0,
        id: ""
    }
    self.update = function(){
        self.updatePosition();
    }
    self.updatePosition = function(){
        self.x += self.spX;
        self.y += self.spY;
    }
    self.getDistance = function(pt){
        return Math.round(Math.sqrt(Math.pow(self.x - pt.x, 2) + Math.pow(self.y - pt.y, 2)));
    }
    return self;
}
const Player = function(id){
    const self = Entity();
    self.id = id;
    self.number = Math.floor(10*Math.random()) + '';
    self.right = false;
    self.left = false;
    self.up = false;
    self.down = false;
    self.attack = false;
    self.speed = 8;
    self.mousePos = {x: 0, y: 0};
    self.hp = 10;
    self.hpMax = 10;
    self.score = 0;

    self.update = function(){
        self.updateSpeed();
        self.updatePosition();

        if(self.attack){
            const x = self.mousePos.x - self.x;
            const y = self.mousePos.y - self.y;
            const angle = Math.round(Math.atan2(y, x) * 180 / Math.PI);
            self.shootBullet(angle, self.id);
        }
    }

    self.shootBullet = function(angle, id){
        const bullet = Bullet(angle, id);
        bullet.x = self.x;
        bullet.y = self.y;
    }

    self.updateSpeed = function(){
        if(self.right)
            self.spX = self.speed;
        else if(self.left)
            self.spX = -self.speed;
        else
            self.spX = 0;

        if(self.up)
            self.spY = -self.speed;
        else if(self.down)
            self.spY = self.speed;
        else
            self.spY = 0;
    }

    self.getInitPack = function(){
        return{
            id: self.id,
            x: self.x,
            y: self.y,
            number: self.number,
            hp: self.hp,
            hpMax: self.hpMax,
            score: self.score
        }
    }

    self.getUpdatePack = function(){
        return{
            id: self.id,
            x: self.x,
            y: self.y,
            number: self.number,
            score: self.score,
            hp: self.hp,
        }
    }

    Player.list[self.id] = self;
    initPack.player.push(self.getInitPack());
    return self;
}
Player.list = {};
Player.onConnect = function(socket){
    //Init player
    const player = Player(socket.id);

    socket.on('keyDown', function(data){
        switch(data.inputId){
            case 'right':
                player.right = data.state;
                break;
            case 'left':
                player.left = data.state;
                break;
            case 'up':
                player.up = data.state;
                break;
            case 'down':
                player.down = data.state;
                break;
            default:
                console.log('Unknown input id!');
                break;
        }
    });
    socket.on('keyUp', function(data){
        switch(data.inputId){
            case 'right':
                player.right = data.state;
                break;
            case 'left':
                player.left = data.state;
                break;
            case 'up':
                player.up = data.state;
                break;
            case 'down':
                player.down = data.state;
                break;
            default:
                console.log('Unknown input id!');
                break;
        }
    });
    socket.on('mouseDown', function(data){
        if(data.inputId === 'attack')
            player.attack = data.state;
    });
    socket.on('mouseUp', function(data){
        if(data.inputId === 'attack')
            player.attack = data.state;
    })
    socket.on('mouseMove', function(data){
        if(data.inputId === 'mousePos')
            player.mousePos = data.state;
    });

    
    
    socket.emit('init', {
        player: Player.getAllInitPack(),
        bullet: Bullet.getAllInitPack()
    })
};
Player.getAllInitPack = function(){
    const currentPlayers = [];
    for(const i in Player.list){
        currentPlayers.push(Player.list[i].getInitPack());
    }
    return currentPlayers;
}
Player.onDisconnect = function(socket){
    removePack.player.push(socket.id);
    delete Player.list[socket.id];
}
Player.update = function(){
    const pack = [];
    for(const id in Player.list){
        const player = Player.list[id];
        player.update();
        pack.push(player.getUpdatePack());        
    }
    return pack;
}

const Bullet = function(angle, parentId){
    const self = Entity();
    self.id = Math.random();
    self.spX = Math.round(Math.cos(angle*Math.PI/180)*10);
    self.spY = Math.round(Math.sin(angle*Math.PI/180)*10);
    self.parentId = parentId;
    self.timer = 0;
    self.toRemove = false;
    const super_update = self.update;
    self.update = function(){
        if(self.timer++>40)
            self.toRemove = true;
        super_update();

        for(const i in Player.list){
            const p = Player.list[i];
            if(self.parentId !== p.id && self.getDistance(p) < 12){
                p.hp -= 1;
                if(p.hp <= 0){
                    p.hp = p.hpMax;
                    p.x = Math.random() * 500;
                    p.y = Math.random() * 500;
                    const shooter = Player.list[self.parentId];
                    if(shooter){
                        shooter.score += 1;
                    }
                }
                self.toRemove = true;
            }
        }
    }
    self.getInitPack = function(){
        return{
            id: self.id,
            x: self.x,
            y: self.y,
        }
    }

    self.getUpdatePack = function(){
        return{
            id: self.id,
            x: self.x,
            y: self.y,
        }
    }

    Bullet.list[self.id] = self;
    initPack.bullet.push(self.getInitPack());
    return self;
}
Bullet.list = {};
Bullet.getAllInitPack = function(){
    const currentBullets = [];
    for(const i in Bullet.list){
        currentBullets.push(Bullet.list[i].getInitPack());
    }
    return currentBullets;
}
Bullet.update = function(){
    
    const pack = [];
    for(const id in Bullet.list){
        const bullet = Bullet.list[id];
        bullet.update();
        if(bullet.toRemove){
            removePack.bullet.push(bullet.id);
            delete Bullet.list[id];
        }
        else{
            pack.push(bullet.getUpdatePack());    
        }
    }
    return pack;
}
// const USERS = {
//     'nam': '321',
//     'thu': '123'
// }
const DEBUG = true;

function isValidUser({username, password}, callback){
    db.account.find({username: username, password: password}, function(err, res){
        if(res.length> 0){
            callback(true);
        }
        else{
            callback(false);
        }
    });
}
function isValidUserRegistry({username}, callback){
    db.account.find({username: username}, function(err, res){
        if(res.length> 0){
            callback(true);
        }
        else{
            callback(false);
        }
    });
}
function addUser({username, password}, callback){
    db.account.insert({username: username, password: password}, function(err){
        callback();
    });
}
const io = require('socket.io')(server, {});
io.sockets.on('connection', function(socket){
    socket.id  = Math.random();
    SOCKET_LIST[socket.id] = socket;

    socket.on('signIn', function(data){
        isValidUser(data, function(res){
            if(res === true){
                console.log('New connection, ID: ', socket.id);
                Player.onConnect(socket);
                socket.emit('signInResponse', {success: true});
            }
            else{
                socket.emit('signInResponse', {success: false});
            }
        })
    });

    socket.on('signUp', function(data){
        isValidUserRegistry(data, function(res){
            if(res === false){
                addUser(data, function(){
                    socket.emit('signUpResponse', {success: true});
                });
            }
            else{
                socket.emit('signUpResponse', {success: false});
            }
        })
    });

    socket.on('disconnect', function(){
        delete SOCKET_LIST[socket.id];
        Player.onDisconnect(socket);
    });

    socket.on('sendMsgToServer', function(data){
        const message = Player.list[socket.id].number + ': ' + data;
        for(const id in SOCKET_LIST){
            SOCKET_LIST[id].emit('addToChat', message);
        }
    });

    socket.on('evalServer', function(data){
        if(!DEBUG)
            return;
        const response = eval(data);
        socket.emit('evalAnswer', response);
    });
});

const initPack = {player: [], bullet: []};
const removePack = {player: [], bullet: []};

setInterval(function(){
    const pack = {
        player: Player.update(),
        bullet: Bullet.update()
    }
    for(const id in SOCKET_LIST){
        const socket = SOCKET_LIST[id];
        socket.emit('init', initPack);
        socket.emit('update', pack);
        socket.emit('remove', removePack);
    }

    initPack.player = [];
    initPack.bullet = [];
    removePack.player = [];
    removePack.bullet = [];
}, 20);