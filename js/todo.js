const storage = window.localStorage;
let loginUser = "guest";
let userTodoList = [];
let currentTodoCount = 0;
let currentDisplayMode = 0;

let updateItemNode;
let updateItemUid;

class DisplayMode {
    static DONE = 3;
    static UNDO = 2;
    static PRIOR = 1;
    static ALL = 0;
}

class Prior {
    static NONE_PRIOR = 3;
    static LOW_PRIOR= 2;
    static MIDDLE_PRIOR = 1;
    static HIGH_PRIOR = 0;
}

class TodoItem {
    static todoItemCounter = 0;
    constructor() {
        TodoItem.todoItemCounter++;
        this.uid = TodoItem.todoItemCounter;
        this.name = "";
        this.prior = Prior.NONE_PRIOR;
        this.isComplete = false;
    }
}

// TODO
// 写注释
// Github Pages 部署

/* 页面加载完成 恢复历史状态 绑定主要监听器 */
window.onload = function () {
    loadSessionUser();
    displayLoginUser();
    loadFromStorage();
    addCreateShortcutListener();
    addDialogButtonListener();
    addMenuListener();
    addMenuItemListener();
    redisplayHistoryTodo();
    addLoginListener();
}

/* 监听器绑定部分 */

function addCreateShortcutListener() {
    let shortcut = document.querySelector(".shortcut-substrate");
    shortcut.addEventListener("click", function () {
        openCreateShortcut();
    })
}

function addDialogButtonListener() {
    let closeBtn = document.querySelector(".dialog-close");
    closeBtn.addEventListener("click", closeDialog);

    let cancelBtn = document.querySelector(".dialog-cancel");
    cancelBtn.onclick = closeDialog;

    let submitBtn = document.querySelector(".dialog-apply");
    submitBtn.onclick = onCreateSubmitClick;
}

function addMenuListener() {
    let menuNode = document.querySelector("#menu");
    menuNode.addEventListener("click", function () {
        let menuList = document.querySelector(".menu-list");
        if(menuList.style.display === "none" || menuList.style.display === "") {
            menuList.style.display = "block";
            fadeIn(menuList);
        } else {
            fadeOut(menuList);
            var menuListFadeTimer = setTimeout(function () {
                menuList.style.display = "none";
                clearTimeout(menuListFadeTimer);
            }, 300);
        }
    })
}

function addMenuItemListener() {
    let menuAllClear = document.querySelector("#menu-all-clear");
    menuAllClear.addEventListener("click", onAllClear);
    let menuAllReset = document.querySelector("#menu-all-reset");
    menuAllReset.addEventListener("click", onAllReset);
    let menuAllDisplay = document.querySelector("#menu-all-display");
    menuAllDisplay.addEventListener("click", onDisplayAll);
    let menuPriorDisplay = document.querySelector("#menu-prior-display");
    menuPriorDisplay.addEventListener("click", function () {
        onDisplayChange(DisplayMode.PRIOR);
    });
    let menuUndoDisplay = document.querySelector("#menu-undo-display");
    menuUndoDisplay.addEventListener("click", function () {
        onDisplayChange(DisplayMode.UNDO);
        document.querySelector("#menu-all-clear").style.display = "block";
        document.querySelector("#menu-all-reset").style.display = "none";
    });
    let menuDoneDisplay = document.querySelector("#menu-done-display");
    menuDoneDisplay.addEventListener("click", function () {
        onDisplayChange(DisplayMode.DONE);
        document.querySelector("#menu-all-clear").style.display = "none";
        document.querySelector("#menu-all-reset").style.display = "block";
    });
    let menuDoneDelete = document.querySelector("#menu-done-delete");
    menuDoneDelete.addEventListener("click", onDeleteDone);
}

function redisplayHistoryTodo() {
    for(let i = 0; i < userTodoList.length; i++) {
        addTodoItemScreen(userTodoList[i]);
    }
}

function addItemMouseListener(itemNode) {
    itemNode.addEventListener("click", function () {
        updateItemNode = this;
        updateItemUid = parseInt(this.querySelector(".todo-id").innerHTML);
        onSwitchItemComplete();
    });
    itemNode.addEventListener("mousedown",  function (event) {
        updateItemNode = this;
        updateItemUid = parseInt(this.querySelector(".todo-id").innerHTML);
        if(event.button === 2) { // 右键
            onCallDelBtn();
        } else if(event.button === 1) { // 中键
            onUpdateItem();
        }
    });
    itemNode.addEventListener("contextmenu", function (event) {
        event.preventDefault();
    })
}

function addItemSlideListener(itemNode) {
    var startX = 0;
    var distance = 0;
    var isMove = false;
    itemNode.addEventListener("touchstart", function (event) {
        event.preventDefault();
        distance = 0;
        isMove = false;
        startX = event.touches[0].clientX;
        updateItemNode = this;
        updateItemUid = parseInt(this.querySelector(".todo-id").innerHTML);
    });
    itemNode.addEventListener("touchmove", function (event) {
        event.preventDefault();
        distance = event.touches[0].clientX - startX;
        isMove = (Math.abs(distance) > 50);
        let parentNode = updateItemNode.parentNode;
        if(distance > 10 && distance <= 50) {
            //rgba(177, 249, 255, 0.95)
            // opacity 0.75
            // 1.56 0.12 0 0
            parentNode.style.backgroundColor = "rgba("+
                Math.floor(255-distance*1.56)+", "+
                Math.floor(255-distance*0.12)+ ", 255, 0.95)";
            parentNode.style.opacity = (1-distance*0.004).toString();
        }
        if(distance < -10 && distance >= -50) {
            //rgba(255, 189, 189, 0.95);
            // opacity 0.75
            // 0 1.32 1.32 0.011 0.005
            parentNode.style.backgroundColor = "rgba(255, "+
                Math.floor(255+distance*1.32)+", "+
                Math.floor(255+distance*1.32)+", 0.95)";
            parentNode.style.opacity = (1+distance*0.004).toString();
        }
    });
    itemNode.addEventListener("touchend", function (event) {
        event.preventDefault();
        let parentNode = updateItemNode.parentNode;
        parentNode.style.backgroundColor = "";
        parentNode.style.opacity = "";
        if(!isMove) {
            onSwitchItemComplete();
        } else {
            if(distance > 0) {
                onUpdateItem();
            } else {
                onCallDelBtn();
            }
        }
    });
}

/* 切换页面筛选器部分 */

function closeMenu() {
    let menuNode = document.querySelector(".menu-list");
    menuNode.style.display = "none";
}

function enableAllMenuBtn() {
    let menuItemBtnList = document.querySelectorAll(".menu-item-btn");
    for(let i = 0; i < menuItemBtnList.length; i++) {
        menuItemBtnList[i].style.display = "block";
    }
}

function removeAllCurrentTodoItem() {
    let todoItemList = document.querySelectorAll(".todo-item");
    for(let i = 0; i < todoItemList.length; i++) {
        todoItemList[i].remove();
    }
    updatePageCount(false, 0);
}

function onAllClear() {
    for(let i = 0; i < userTodoList.length; i++) {
        if(userTodoList[i].isComplete === false) {
            let todoItem = userTodoList[i];
            todoItem.isComplete = true;
            updateItemStorage(todoItem);
        }
    }

    let todoInputNodeList = document.querySelectorAll(".todo-item");
    let todoListNode = document.querySelector(".todo-list");
    for(let i = 0; i < todoInputNodeList.length; i++) {
        if(currentDisplayMode === DisplayMode.UNDO) {
            todoListNode.removeChild(todoInputNodeList[i]);
        } else {
            todoInputNodeList[i].querySelector(".todo-check").checked = true;
            todoInputNodeList[i].querySelector(".todo-prior").style.color = "grey";
            todoInputNodeList[i].querySelector(".todo-desc").style.color = "grey";
            todoInputNodeList[i].querySelector(".todo-desc").style.textDecoration = "line-through";
        }
    }

    if(currentDisplayMode === DisplayMode.UNDO) {
        updatePageCount(false, 0);
    }
    closeMenu();
}

function onAllReset() {
    for(let i = 0; i < userTodoList.length; i++) {
        if(userTodoList[i].isComplete === true) {
            let todoItem = userTodoList[i];
            todoItem.isComplete = false;
            updateItemStorage(todoItem);
        }
    }

    let todoInputNodeList = document.querySelectorAll(".todo-item");
    let todoListNode = document.querySelector(".todo-list");
    for(let i = 0; i < todoInputNodeList.length; i++) {
        if(currentDisplayMode === DisplayMode.DONE) {
            todoListNode.removeChild(todoInputNodeList[i]);
        } else {
            todoInputNodeList[i].querySelector(".todo-check").checked = false;
            todoInputNodeList[i].querySelector(".todo-prior").style.color = "";
            todoInputNodeList[i].querySelector(".todo-desc").style.color = "";
            todoInputNodeList[i].querySelector(".todo-desc").style.textDecoration = "";
        }
    }

    if(currentDisplayMode === DisplayMode.DONE) {
        updatePageCount(false, 0);
    }
    closeMenu();
}

function onDisplayAll() {
    currentDisplayMode = DisplayMode.ALL;
    removeAllCurrentTodoItem();
    enableAllMenuBtn();
    let displayModeSpan = document.querySelector(".filter-type");
    displayModeSpan.innerHTML = "默认";

    for(let i = 0; i < userTodoList.length; i++) {
        addTodoItemScreen(userTodoList[i]);
    }
    closeMenu();
}

function onDisplayChange(displayMode) {
    currentDisplayMode = displayMode;
    removeAllCurrentTodoItem();
    let displayModeSpan = document.querySelector(".filter-type");

    if (displayMode === DisplayMode.PRIOR) {
        enableAllMenuBtn();
        displayModeSpan.innerHTML = "高优先";
        for(let i = 0; i < userTodoList.length; i++) {
            if (userTodoList[i].prior === Prior.HIGH_PRIOR) {
                addTodoItemScreen(userTodoList[i]);
            }
        }
    } else if(displayMode === DisplayMode.UNDO) {
        displayModeSpan.innerHTML = "未完成";
        for(let i = 0; i < userTodoList.length; i++) {
            if(userTodoList[i].isComplete === false) {
                addTodoItemScreen(userTodoList[i]);
            }
        }
    } else if(displayMode === DisplayMode.DONE) {
        displayModeSpan.innerHTML = "已完成";
        for(let i = 0; i < userTodoList.length; i++) {
            if (userTodoList[i].isComplete === true) {
                addTodoItemScreen(userTodoList[i]);
            }
        }
    }
    closeMenu();
}

function onDeleteDone() {
    for(let i = 0; i < userTodoList.length; i++) {
        if(userTodoList[i].isComplete) {
            deleteItemStorage(userTodoList[i].uid);
            i--;
        }
    }
    let remainNum = 0;
    let todoItemNodeList = document.querySelectorAll(".todo-item");
    let todoListNode = document.querySelector(".todo-list");
    for(let i = 0; i < todoItemNodeList.length; i++) {
        if(todoItemNodeList[i].querySelector(".todo-check").checked) {
            todoListNode.removeChild(todoItemNodeList[i]);
        } else {
            remainNum++;
        }
    }
    updatePageCount(false, remainNum);
    closeMenu();
}

function addLoginListener() {
    let userLoginMenuNode = document.querySelector("#account");
    userLoginMenuNode.addEventListener("click", onOpenLoginDialog);
}

/* 用户登录 */

function onOpenLoginDialog() {
    closeMenu();
    document.querySelector(".dialog-title").innerHTML = "登录";
    document.querySelector(".dialog-input").placeholder = "用户名";
    document.querySelector(".dialog-apply").onclick = onLoginFormSubmit;
    let movableNode =  document.querySelector(".dialog-movable");
    if(movableNode != null) {movableNode.remove();}
    document.querySelector(".dialog-form").insertBefore(
        createLoginInput(), document.querySelector(".dialog-option"));
    let dialogNode = document.querySelector(".dialog");
    dialogNode.style.display = "block";
    fadeIn(dialogNode);
    document.querySelector(".register-navi").onclick = onOpenRegisterDialog;

}

function createLoginInput() {
    let dialogMovableNode = document.createElement("div");
    dialogMovableNode.className = "dialog-movable";
    let passwordLabel = document.createElement("label");
    passwordLabel.className = "dialog-label";
    let passwordInput = document.createElement("input");
    passwordInput.className = "dialog-input";
    passwordInput.type = "password";
    passwordInput.id = "password-input";
    passwordInput.placeholder = "输入密码";
    let registerNavi = document.createElement("span");
    registerNavi.className = "register-navi";
    registerNavi.innerHTML = "没有账户，请注册";
    registerNavi.onclick = onOpenLoginDialog;
    passwordLabel.insertBefore(passwordInput, passwordLabel.firstChild);
    dialogMovableNode.insertBefore(registerNavi, dialogMovableNode.firstChild);
    dialogMovableNode.insertBefore(passwordLabel, dialogMovableNode.firstChild);
    return dialogMovableNode;
}

function onLoginFormSubmit() {
    let username = document.querySelector("#main-input").value.trim();
    let password = document.querySelector("#password-input").value.trim();
    switch (checkUserLogin(username, password)) {
        case 1:
            displayWarnMsg("用户不存在");
            return;
        case 2:
            displayWarnMsg("密码错误");
            return;
        default:
            displayWarnMsg("登录成功");
    }
    window.sessionStorage.setItem("loginUser", username);
    loginUser = username;
    removeAllCurrentTodoItem();
    loadFromStorage();
    displayLoginUser();
    redisplayHistoryTodo();
    closeDialog();
}

function displayLoginUser() {
    let username = window.sessionStorage.getItem("loginUser");
    if(username === null) {
        document.querySelector(".login-user").innerHTML = "Guest";
    } else {
        document.querySelector(".login-user").innerHTML = username;
    }
}

function onOpenRegisterDialog() {
    document.querySelector(".dialog-title").innerHTML = "注册";
    let passwordLabel = document.createElement("label");
    passwordLabel.className = "dialog-label";
    let passwordInput = document.createElement("input");
    passwordInput.className = "dialog-input";
    passwordInput.type = "password";
    passwordInput.id = "password-re-input";
    passwordInput.placeholder = "重复密码";
    passwordLabel.insertBefore(passwordInput, passwordLabel.firstChild);
    let movable = document.querySelector(".dialog-movable");
    movable.insertBefore(passwordLabel, movable.lastChild);
    fadeIn(passwordLabel);
    let naviNode = document.querySelector(".register-navi");
    naviNode.style.display = "none";
    naviNode.onclick = null;
    document.querySelector(".dialog-apply").onclick = onRegisterFormSubmit;
}

function onRegisterFormSubmit() {
    let username = document.querySelector("#main-input").value.trim();
    let password = document.querySelector("#password-input").value.trim();
    let rePassword = document.querySelector("#password-re-input").value.trim();
    if(!registerValidate(username, password, rePassword)) {
        return;
    }
    displayWarnMsg("请前往登录页登录");
    addUserStorage(username, password);
    closeDialog();
}

function displayWarnMsg(msg) {
    let navi = document.querySelector(".register-navi");
    navi.onclick = null;
    navi.style.display = "block";
    navi.innerHTML = msg;
}

function registerValidate(username, password, rePassword) {
    if(username === "") {
        displayWarnMsg("用户名不能为空");
        return false;
    }
    if(password !== rePassword) {
        displayWarnMsg("密码不一致");
        return false;
    }
    if(password === "") {
        displayWarnMsg("密码不能为空");
        return false;
    }
    if(password.length < 4) {
        displayWarnMsg("密码太简单");
        return false;
    }
    if(checkUsernameExist(username)) {
        displayWarnMsg("用户名已经存在");
        return false;
    }
    return true;
}

function restoreDialogLayout() {
    let formMovableNode = document.querySelector(".dialog-movable");
    formMovableNode.remove();
    let newFormMovable = document.createElement("div");
    newFormMovable.className = "dialog-movable";
    newFormMovable.innerHTML = "<h3>优先级</h3>\n" +
        "                        <div class=\"dialog-prior\">\n" +
        "                            <label class=\"dialog-prior-label\">\n" +
        "                                <input class=\"prior-ratio\" type=\"radio\" name=\"prior\">\n" +
        "                                <span class=\"ratio-desc\">高</span>\n" +
        "                                <span class=\"high-prior\">!!!</span>\n" +
        "                            </label>\n" +
        "                            <label class=\"dialog-prior-label\">\n" +
        "                                <input class=\"prior-ratio\" type=\"radio\" name=\"prior\">\n" +
        "                                <span class=\"ratio-desc\">中</span>\n" +
        "                                <span class=\"middle-prior\">!!</span>\n" +
        "                            </label>\n" +
        "                            <label class=\"dialog-prior-label\">\n" +
        "                                <input class=\"prior-ratio\" type=\"radio\" name=\"prior\">\n" +
        "                                <span class=\"ratio-desc\">低</span>\n" +
        "                                <span class=\"low-prior\">!</span>\n" +
        "                            </label>\n" +
        "                            <label class=\"dialog-prior-label\">\n" +
        "                                <input class=\"prior-ratio\" type=\"radio\" name=\"prior\" checked=\"checked\">\n" +
        "                                <span class=\"ratio-desc\">无</span>\n" +
        "                                <span class=\"no-prior\">~</span>\n" +
        "                            </label>\n" +
        "                        </div>";
    document.querySelector(".dialog-form").insertBefore(
        newFormMovable, document.querySelector(".dialog-option"));
}


/* Todo条目操作部分 */

function onCreateSubmitClick() {
    onDialogCreateFormSubmit();
    closeDialog();
}

function onUpdateSubmitClick() {
    onUpdateFormSubmit();
    closeDialog();
}

/* 切换单个Todo的完成状态 */
function onSwitchItemComplete() {
    let todoCheck = updateItemNode.querySelector(".todo-check");
    let todoPrior = updateItemNode.querySelector(".todo-prior");
    let todoDesc = updateItemNode.querySelector(".todo-desc");
    let order = getListOrderByUid(updateItemUid);
    let todoItem = userTodoList[order];

    if (todoCheck.checked === false || todoCheck.checked === "") {
        todoItem.isComplete = true;
        todoCheck.checked = true;
        todoPrior.style.color = "grey";
        todoDesc.style.textDecoration = "line-through";
        todoDesc.style.color = "grey";
    } else {
        todoItem.isComplete = false;
        todoCheck.checked = false;
        todoPrior.style.color = "";
        todoDesc.style.textDecoration = "";
        todoDesc.style.color = "";
    }
    updateItemStorage(todoItem);
}

/* 修改单个Todo */
function findCheckedRatio() {
    let ratioList = document.querySelectorAll(".prior-ratio");
    for (let i = 0; i < ratioList.length; i++) {
        if (ratioList[i].checked === true) {
            return i;
        }
    }
    return -1;
}

function onCallDelBtn() {
    let itemLabel = updateItemNode.parentNode.querySelector(".todo-item label");
    itemLabel.style.width = "80%";
    let delBtnNode = updateItemNode.parentNode.querySelector(".todo-delete");
    delBtnNode.style.display = "inline-block";
    fadeIn(delBtnNode);
    var delBtnOpacityTimer = setTimeout(function () {
        fadeOut(delBtnNode);
        clearTimeout(delBtnOpacityTimer);
        var delBtnDisplayTimer = setTimeout(function () {
            delBtnNode.style.display = "none";
            itemLabel.style.width = "100%";
            clearTimeout(delBtnDisplayTimer);
        }, 300);
    }, 2500);
}

function onUpdateItem() {
    document.querySelector(".dialog-title").innerHTML = "更改任务";
    document.querySelector("#main-input").placeholder = "任务名称";
    let todoItem = userTodoList[getListOrderByUid(updateItemUid)];
    setDialogInfo(todoItem.name, todoItem.prior)
    // 需要设计条目修改的交互方式 完成窗口的调出与表单验证提交
    document.querySelector(".dialog-apply").onclick = onUpdateSubmitClick;
    let dialogNode = document.querySelector(".dialog");
    dialogNode.style.display = "block";
    fadeIn(dialogNode);
}

function onUpdateFormSubmit() {
    let todoName = document.querySelector(".dialog-input").value;
    let todoPrior = findCheckedRatio();
    let todoItem = userTodoList[getListOrderByUid(updateItemUid)];
    todoItem.name = todoName;
    todoItem.prior = todoPrior;
    updateItemStorage(todoItem);
    updateItemNode.querySelector(".todo-desc").innerHTML = todoName;
    let priorNode = updateItemNode.querySelector(".todo-prior");
    switch (todoItem.prior) {
        case Prior.LOW_PRIOR:
            priorNode.innerHTML = "!";
            priorNode.className = "todo-prior low-prior";
            break;
        case Prior.MIDDLE_PRIOR:
            priorNode.innerHTML = "!!";
            priorNode.className = "todo-prior middle-prior";
            break;
        case Prior.HIGH_PRIOR:
            priorNode.innerHTML = "!!!";
            priorNode.className = "todo-prior high-prior";
            break;
        default:
            priorNode.innerHTML = "~";
            priorNode.className = "todo-prior no-prior";
    }
}

/* 删除单个Todo */
function onDeleteBtnClick() {
    let todoItemNode = this.parentNode;
    let todoListNode = todoItemNode.parentNode;
    let itemUid = parseInt(todoItemNode.querySelector(".todo-id").innerHTML);
    deleteItemStorage(itemUid);
    todoListNode.removeChild(todoItemNode);
    updatePageCount(false);
}

/* 打开快速新建弹框 */
function openCreateShortcut() {
    closeMenu();
    let dialog = document.querySelector(".dialog");
    dialog.style.display = "block";
    fadeIn(dialog);
    let dialogTitle = document.querySelector(".dialog-title");
    dialogTitle.innerHTML = "新建任务"
    document.querySelector("#main-input").placeholder = "任务名称";
    document.querySelector(".dialog-apply").onclick = onCreateSubmitClick;
    setDialogInfo();
}

/* 关闭弹框 */
function closeDialog() {
    let dialog = document.querySelector(".dialog");
    let dialogInput = document.querySelector(".dialog-input");
    fadeOut(dialog);
    var dialogFadeTimer = setTimeout(function () {
        dialog.style.display = "none";
        dialogInput.value = "";
        restoreDialogLayout();
        clearTimeout(dialogFadeTimer);
    }, 300)
}

/* 填充弹框页面信息 */
function setDialogInfo(todoName="", todoPrior=Prior.NONE_PRIOR) {
    let dialogTodo = document.querySelector(".dialog-input");
    dialogTodo.value = todoName;

    let todoPriorRatioList = document.querySelectorAll(".prior-ratio");
    for(let i = 0; i < todoPriorRatioList.length; i++) {
        todoPriorRatioList[i].checked = false;
    }
    todoPriorRatioList[todoPrior].checked = true;
}

/* 新建Todo表单提交回调 */
function onDialogCreateFormSubmit() {
    let dialogInput = document.querySelector(".dialog-input");
    let todoName = dialogInput.value;
    let priorNumber = findCheckedRatio();

    let todoItem = createTodoObj(todoName, priorNumber);
    createItemStorage(todoItem);

    // 根据页面展示状态插入新增的todo条目
    if(canItemDisplay(todoItem)){
        addTodoItemScreen(todoItem);
    }
}

function createTodoObj(todoName, todoPrior) {
    let todoItem = new TodoItem();
    todoItem.name = todoName;
    todoItem.prior = todoPrior;
    todoItem.isComplete = false;
    syncStorageTodoCounter();
    return todoItem;
}

function canItemDisplay(todoItem) {
    if(DisplayMode.ALL === currentDisplayMode)
        return true;
    else if(DisplayMode.DONE === currentDisplayMode && todoItem.isComplete)
        return true;
    else if(DisplayMode.UNDO === currentDisplayMode && !todoItem.isComplete)
        return true;
    else if(DisplayMode.PRIOR === currentDisplayMode && todoItem.prior === Prior.HIGH_PRIOR)
        return true;
    return false;
}

/* 将新建项添加到屏幕展示 */
function addTodoItemScreen(todoItem) {
    let todoListNode = document.querySelector(".todo-list");
    let newNode = createTodoItemNode(todoItem);
    todoListNode.insertBefore(newNode, todoListNode.firstChild);
    fadeIn(newNode);
    updatePageCount(true);
}

/* 更新页面显示计数器 */
function updatePageCount(isInc, num=-1) {
    if(num === -1) {
        if (isInc)
            currentTodoCount++;
        else
            currentTodoCount--;
    } else
        currentTodoCount = num;
    document.querySelector("#todo-count").innerHTML = currentTodoCount.toString();
}

/* 创建新的Todo项DOM节点 */
function createTodoItemNode(todoItem) {
    let itemDiv = document.createElement("div");
    itemDiv.className = "todo-item";
    let itemLabel = document.createElement("label");

    let itemId = document.createElement("span");
    itemId.className = "todo-id";
    itemId.innerHTML = todoItem.uid.toString();

    let itemCheck = document.createElement("input");
    itemCheck.className = "todo-check";
    itemCheck.type = "checkbox";

    let itemPrior = document.createElement("span");
    itemPrior.className = "todo-prior ";
    switch(todoItem.prior) {
        case Prior.LOW_PRIOR:
            itemPrior.className += "low-prior";
            itemPrior.innerHTML = "!";
            break;
        case Prior.MIDDLE_PRIOR:
            itemPrior.className += "middle-prior";
            itemPrior.innerHTML = "!!";
            break;
        case Prior.HIGH_PRIOR:
            itemPrior.className += "high-prior";
            itemPrior.innerHTML = "!!!";
            break;
        default:
            itemPrior.className += "no-prior";
            itemPrior.innerHTML = "~";
            break;
    }

    let itemDesc = document.createElement("span");
    itemDesc.className = "todo-desc";
    itemDesc.innerHTML = todoItem.name;

    let itemDelBtn = document.createElement("button");
    itemDelBtn.className = "todo-delete";
    itemDelBtn.innerHTML = "删除";
    itemDelBtn.addEventListener("click", onDeleteBtnClick);
    itemDelBtn.style.display = "none";

    if(todoItem.isComplete) {
        itemPrior.style.color = "grey";
        itemDesc.style.textDecoration = "line-through";
        itemDesc.style.color = "grey";
        itemCheck.checked = true;
    }

    itemLabel.insertBefore(itemDesc, itemLabel.firstChild);
    itemLabel.insertBefore(itemPrior, itemLabel.firstChild);
    itemLabel.insertBefore(itemCheck, itemLabel.firstChild);
    itemLabel.insertBefore(itemId, itemLabel.firstChild);
    addItemMouseListener(itemLabel);
    addItemSlideListener(itemLabel);
    itemDiv.insertBefore(itemDelBtn, itemDiv.firstChild);
    itemDiv.insertBefore(itemLabel, itemDiv.firstChild);
    return itemDiv;
}

/* 持久层部分 */

function getListOrderByUid(uid) {
    for(let i = 0; i < userTodoList.length; i++) {
        if(userTodoList[i].uid === uid) {
            return i;
        }
    }
}

function  createItemStorage(todoItem) {
    userTodoList.push(todoItem);
    syncItemWithStorage(todoItem);
}

function updateItemStorage(todoItem) {
    let order = getListOrderByUid(todoItem.uid);
    userTodoList[order] = todoItem;
    syncItemWithStorage(todoItem);
}

function deleteItemStorage(uid) {
    let order = getListOrderByUid(uid);
    storage.removeItem(loginUser+":"+uid.toString());
    userTodoList.splice(order, 1);
}

function syncStorageTodoCounter() {
    storage.setItem("todoUid", JSON.stringify(TodoItem.todoItemCounter));
}

function syncItemWithStorage(todoItem) {
    storage.setItem(loginUser+":"+todoItem.uid.toString(), JSON.stringify(todoItem));
}

function checkUsernameExist(username) {
    if(username === "user" || username === "todoUid" || username === "guest") {return true;}
    let storeName = "user:" + username;
    let check = storage.getItem(storeName);
    return check !== null;
}

function addUserStorage(username, password) {
    let storeName = "user:" + username;
    storage.setItem(storeName, password);
}

function checkUserLogin(username, password) {
    if(!checkUsernameExist(username)) {
        return 1;
    }
    let inPassword = storage.getItem("user:" + username);
    if(!(password === inPassword)) {
        return 2;
    }
    return 0;
}

function loadSessionUser() {
    let check = window.sessionStorage.getItem("loginUser");
    if(check === null) {
        loginUser = "guest";
    } else {
        loginUser = check;
    }
}

function loadFromStorage() {
    if(storage.getItem("todoUid") == null) {
        return;
    }
    TodoItem.todoItemCounter = JSON.parse(storage.getItem("todoUid"));
    for(let i = 0; i < storage.length; i++) {
        let key = storage.key(i);
        if(key.split(":")[0] === loginUser) {
            userTodoList.push(JSON.parse(storage.getItem(storage.key(i))));
        }
    }
}

/* 动画部分 */

function fadeIn(node, speed = 10) {
    node.style.opacity = 0;
    var inCounter = 0;
    var fadeInTimer = setInterval(function () {
        inCounter = inCounter + 5;
        node.style.opacity = inCounter / 100;
        if(inCounter >= 100) {
            clearInterval(fadeInTimer);
        }
    }, speed);
}

function fadeOut(node, speed = 10) {
    node.style.opacity = 1;
    var outCounter = 100;
    var fadeOutTimer = setInterval(function () {
        outCounter = outCounter - 5;
        node.style.opacity = outCounter / 100;
        if(outCounter <= 0) {
            clearInterval(fadeOutTimer);
        }
    }, speed);
}