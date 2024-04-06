const WIDTH_FIELD = 40
const HEIGHT_FIELD = 24

const TILE_SIZE = 50

const COUNT_ROOMS = {
    min: 5,
    max: 10
}
const SIZE_ROOMS = {
    min: 3,
    max: 8
}
const COUNT_CORRIDORS = {
    min: 3,
    max: 5
}

const COUNT_SWORDS = 2
const COUNT_HEALS = 10
const COUNT_ENEMY = 10

const MAX_HP_PLAYER = 10
const MAX_HP_ENEMY = 10
const BASE_ATTACK = 2

const mapTypesTiles = {
    Wall: "tileW",
    Floor: "tileF",
    Sword: "tileSW",
    Heal: "tileHP",
    Enemy: "tileE",
    Player: "tileP",
}

function randomInt(n) {
    return Math.floor(Math.random() * n)
}

function randomRange(range) {
    let {min, max} = range
    return Math.floor(Math.random() * (max - min + 1) + min)
}

function randomElementArray(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

class Game {
    constructor() {
        this.player = {
            hp: {
                current: MAX_HP_PLAYER,
                max: MAX_HP_PLAYER
            },
            attack: BASE_ATTACK,
            position: {x: 0, y: 0}
        }

        this.offsetView = {x: 0, y: 0}

        this.listEnemy = []

        this.end = false
        this.win = false
        this.fail = false

        this.field = this.generateField()
        this.spawnObjects()
        this.setEventListeners()

        this.updateField()
    }

    getTile(y, x) {
        if (y < 0 || y >= HEIGHT_FIELD) return null
        if (x < 0 || x >= WIDTH_FIELD) return null
        return this.field[y][x]
    }

    getSizeField() {
        const fieldDOM = document.querySelector(".field")
        return {
            width: Math.floor(fieldDOM.clientWidth / TILE_SIZE),
            height: Math.floor(fieldDOM.clientHeight / TILE_SIZE)
        }
    }

    getEnemy(y, x) {
        return this.listEnemy.find(enemy => enemy.x === x && enemy.y === y)
    }

    getEmptySpace(field=null) {
        if (!field) field = this.field
        const resultArr = []
        for (let i = 0; i < HEIGHT_FIELD; i++) {
            for (let j = 0; j < WIDTH_FIELD; j++) {
                if (field[i][j] === "Floor") {
                    resultArr.push([i, j])
                }
            }
        }
        return resultArr
    }

    getRadius(y, x, actionFunc) {
        for (let i = y - 1; i <= y + 1; i++) {
            for (let j = x - 1; j <= x + 1; j++) {
                const tile = this.getTile(i, j)
                if (!tile) continue
                actionFunc(tile, i, j)
            }
        }
    }

    generateField() {
        const field = []
        for (let i = 0; i < HEIGHT_FIELD; i++) {
            field.push([])
            for (let j = 0; j < WIDTH_FIELD; j++) {
                field[i].push("Wall")
            }
        }

        const countCorridorsHorizontal = randomRange(COUNT_CORRIDORS)
        for (let i = 0; i < countCorridorsHorizontal; i++) {
            const y = randomInt(HEIGHT_FIELD)
            for (let j = 0; j < WIDTH_FIELD; j++) {
                field[y][j] = "Floor"
            }
        }

        const countCorridorsVertical = randomRange(COUNT_CORRIDORS)
        for (let i = 0; i < countCorridorsVertical; i++) {
            const x = randomInt(WIDTH_FIELD)
            for (let j = 0; j < HEIGHT_FIELD; j++) {
                field[j][x] = "Floor"
            }
        }

        const countRooms = randomRange(COUNT_ROOMS)
        for (let i = 0; i < countRooms; i++) {
            const width = randomRange(SIZE_ROOMS)
            const height = randomRange(SIZE_ROOMS)

            const [y, x] = randomElementArray(this.getEmptySpace(field))

            let verticalDirection = randomInt(2) ? -1 : 1
            let horizontalDirection = randomInt(2) ? -1 : 1

            for (let j = this.offsetView.y; j < height; j++) {
                for (let k = this.offsetView.x; k < width; k++) {     
                    let newY = y + j * verticalDirection
                    let newX = x + k * horizontalDirection
                    if (newY >= HEIGHT_FIELD || newY < 0) continue
                    if (newX >= WIDTH_FIELD || newX < 0) continue 
                    field[newY][newX] = "Floor"
                }
            }
        }

        return field
    }

    spawnEntinty(stringEntinty) {
        const [y, x] = randomElementArray(this.getEmptySpace())
        this.field[y][x] = stringEntinty
        return {x, y}
    }

    spawnObjects() {
        for (let i = 0; i < COUNT_HEALS; i++) this.spawnEntinty("Heal")
        for (let i = 0; i < COUNT_SWORDS; i++) this.spawnEntinty("Sword")
        for (let i = 0; i < COUNT_ENEMY; i++) {
            const {x, y} = this.spawnEntinty("Enemy")
            this.listEnemy.push({x, y, hp: MAX_HP_ENEMY, playerNearby: false})
        }
        this.player.position = this.spawnEntinty("Player")
    }

    moveView(deltaX, deltaY) {
        let {x, y} = this.offsetView
        let newX = x + deltaX
        let newY = y + deltaY

        if (newX < 0 || newY < 0) return

        const countVisibleTiles = this.getSizeField()
        
        if (WIDTH_FIELD <= countVisibleTiles.width + newX) return
        if (HEIGHT_FIELD <= countVisibleTiles.height + newY) return
        
        this.offsetView.x = newX
        this.offsetView.y = newY

        this.updateField()
    }

    movePlayer(deltaX, deltaY) {
        let {x, y} = this.player.position
        let newX = x + deltaX
        let newY = y + deltaY

        const tile = this.getTile(newY, newX)
        if (!tile) return 
        if (["Wall", "Enemy"].includes(tile)) return
        
        if (tile === "Heal") {
            const hpObj = this.player.hp
            hpObj.current += 2
            if (hpObj.max < hpObj.current) hpObj.current = hpObj.max
        }
        if (tile === "Sword") this.player.attack += 2


        this.field[y][x] = "Floor"
        this.field[newY][newX] = "Player"

        this.player.position.x = newX
        this.player.position.y = newY

        this.nextTick()
    }

    attackPlayer() {
        const {x, y} = this.player.position

        this.getRadius(y, x, (tile, y, x) => {
            if (tile === "Enemy") {
                const enemy = this.getEnemy(y, x)
                enemy.hp -= this.player.attack
                if (enemy.hp <= 0) {
                    this.field[y][x] = "Floor"
                    this.listEnemy.splice(this.listEnemy.indexOf(enemy), 1)
                    if (this.listEnemy.length == 0) {
                        this.end = true
                        this.win = true
                        this.showEnd()
                    }
                }
                this.nextTick()
            }
        })
    }

    attackEnemy() {
        this.listEnemy.forEach(enemy => {
            const {x, y} = enemy
            let flagNearby = false
            this.getRadius(y, x, (tile, y, x) => {
                if (tile === "Player") {
                    flagNearby = true
                    const hpObj = this.player.hp
                    hpObj.current -= 1
                    if (hpObj.current <= 0) {
                        this.field[y][x] = "Floor"
                        this.end = true
                        this.fail = true
                        this.showEnd()
                    }
                }
            })
            enemy.playerNearby = flagNearby
        })
    }

    moveEnemy() {
        this.listEnemy.forEach(enemy => {
            if (enemy.playerNearby) return
            const {x, y} = enemy
            let flagNearby = false
            const variants = []
            this.getRadius(y, x, (tile, newY, newX) => {
                if (tile === "Player") flagNearby = true
                if (tile === "Floor") variants.push({newX, newY})
            })
            if (flagNearby) return
        
            const {newX, newY} = randomElementArray(variants)
            this.field[y][x] = "Floor"
            this.field[newY][newX] = "Enemy"
            enemy.x = newX
            enemy.y = newY
        })
    }

    nextTick() {
        this.moveEnemy()
        this.attackEnemy()
        this.updateField()
    }

    setEventListeners() {
        const mapHandlers = {
            ArrowUp: () => this.moveView(0, -1),
            ArrowDown: () => this.moveView(0, 1),
            ArrowLeft: () => this.moveView(-1, 0),
            ArrowRight: () => this.moveView(1, 0),
            KeyW: () => this.movePlayer(0, -1),
            KeyS: () => this.movePlayer(0, 1),
            KeyA: () => this.movePlayer(-1, 0),
            KeyD: () => this.movePlayer(1, 0),
            Space: () => this.attackPlayer()
        }

        const body = document.querySelector("body")
        body.addEventListener("keydown", e => {
            if (this.end) return
            const key = e.code
            if (key in mapHandlers) {
                mapHandlers[key]()
            }
        })
    }

    showEnd() {
        const label = document.querySelector(".label-result")
        let text = ""
        if (this.fail) text = "Вы проиграли. Перезапустите страницу"
        if (this.win) text = "Вы победили. Перезапустите страницу"
        label.textContent = text
    }

    updateField() {
        const fieldDOM = document.querySelector(".field")
        const countVisibleTiles = this.getSizeField()

        fieldDOM.innerHTML = ""

        for (let i = 0; i < countVisibleTiles.height; i++) {
            for (let j = 0; j < countVisibleTiles.width; j++) {
                const { x, y } = this.offsetView

                const indexTile = { x: j + x, y: i + y}
                const tile = this.getTile(indexTile.y, indexTile.x)
                if (!tile) throw new Error(`Tile not found. y=${indexTile.y};x=${indexTile.x}`)

                const tileDiv = document.createElement("div")
                tileDiv.classList.add("tile")
                tileDiv.classList.add(mapTypesTiles[tile])

                if (["Player", "Enemy"].includes(tile)) {
                    let hp = this.player.hp.current
                    if (tile == "Enemy") {
                        const enemy = this.getEnemy(indexTile.y, indexTile.x)
                        hp = enemy.hp
                    }
                    const healthDiv = document.createElement("div")
                    healthDiv.classList.add("health")
                    healthDiv.style.width = `${hp * 10}%`
                    tileDiv.appendChild(healthDiv)
                }

                tileDiv.style.left = `${j * TILE_SIZE}px`
                tileDiv.style.top = `${i * TILE_SIZE}px`

                fieldDOM.appendChild(tileDiv)
            }
        }
    }
}

const game = new Game()
