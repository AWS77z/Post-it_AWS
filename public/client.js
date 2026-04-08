let b=0;
document.getElementById("main").addEventListener("click", function(event){
    let X = event.clientX;
    let Y = event.clientY;
    let div = document.createElement("div");
    div.style.position="absolute";
    div.style.left = `${X-50}px`;
    div.style.top = `${Y}px`;
    div.style.width ="100px";
    div.style.height ="100px";
    div.style.border="solid 1px black"
    div.style.backgroundColor="blue";
    document.getElementById("sous").appendChild(div);
    
    
})