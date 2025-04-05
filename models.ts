export interface IPlayer {
    socketId: string; // socket id of the player
    life: number; // number of lives left
    invulnerable: boolean; // is the player invulnerable
    x: number; // x position of the player
    y: number; // y position of the player
    w: number; // width of the player
    h: number; // height of the player
    color: string; // color of the player
}

export interface ITraffic {
    id: number; // id of the traffic
    x: number; // x position of the traffic
    y: number; // y position of the traffic
    w: number; // width of the traffic
    h: number; // height of the traffic
}