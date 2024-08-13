export function showElement(id, display) {
  document.getElementById(id).style.display = display;
}

export function hideElement(id) {
  document.getElementById(id).style.display = "none";
}

function updateModalContent(planId, planName, title="Purchase") {
  document.getElementById("plan_id").value = planId;
  document.getElementById("purchase-plan-title").textContent = `${title} ${planName}`;
}

function resetModal() {
  document.getElementById("plan_id").value = "";
  document.getElementById("purchase_phone").value = "";
  document.getElementById("purchase-plan-title").textContent = "";
}

function createListItem(plan) {
  const limitInfo = plan.limit.type === "Unlimited"
    ? "Unlimited"
    : `${plan.limit.data.value} ${plan.limit.data.unit}`;

  const listItem = document.createElement("li");
  listItem.className = "py-3 sm:py-4";

  listItem.innerHTML = `
    <div class="flex gap-4 flex-col md:flex-row md:items-center border rounded p-4">
      <div class="flex space-x-4">
        <div class="flex-1 min-w-0 ms-4">
          <p class="text-sm font-medium text-gray-900 truncate dark:text-white">
            ${plan.name} (${limitInfo})
          </p>
          <p class="text-sm text-gray-500 truncate dark:text-gray-400">
            ${plan.bandwidth.down.value} ${plan.bandwidth.down.unit} Down / ${plan.bandwidth.up.value} ${plan.bandwidth.up.unit} Up
          </p>
        </div>
        <div class="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white">
          ${plan.price.value} ${plan.price.unit}
        </div>
      </div>
      <button
        onclick="handlePurchaseClick(${plan.id}, '${plan.name}')"
        class="w-full md:w-32 border hover:text-white hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
      >
        Purchase
      </button>
    </div>
  `;

  return listItem;
}

// Business Logic

async function fetchConfig() {
  const response = await fetch("/config.json");
  if (!response.ok) {
    throw new Error("Failed to fetch config");
  }
  return response.json();
}

async function fetchPlans(baseURL, routerId) {
  const response = await fetch(`${baseURL}/system/api.php?r=hotspot`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "listPlans",
      params: { router: [routerId] },
    }),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch plans");
  }
  return response.json();
}

async function activatePlan(baseURL, phoneNumber, macAddress, ipAddress) {
  const payload = {
    action: "purchasePlan",
    params: { phoneNumber, macAddress, ipAddress, password:macAddress },
  };

  try {
    const response = await fetch(`${baseURL}/system/api.php?r=hotspot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error("Error posting purchase plan:", error);
    return false;
  }

}

async function postPurchasePlan(baseURL, phoneNumber, macAddress, ipAddress, planId) {
  const payload = {
    action: "purchasePlan",
    params: { phoneNumber, macAddress, ipAddress, planId },
  };

  try {
    const response = await fetch(`${baseURL}/system/api.php?r=hotspot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error("Error posting purchase plan:", error);
    return false;
  }
}

// Event Handlers

function handlePurchaseClick(planId, planName) {
  updateModalContent(planId, planName);
  showElement("purchase-plan-form-submit", "unset");
  hideElement("purchase-plan-form-close");
  showElement("modal", "flex");
}

function handleModalClose() {
  resetModal();
  hideElement("modal");
  showElement("purchase-plan-input", "block");
  hideElement("purchase-plan-success");
  hideElement("purchase-plan-error");
}

function createActivateHandler(config) {
  return (event) => {
  event.preventDefault();
  showElement("purchase-loader", "flex");
  updateModalContent("","Activating Purchased Plan", "");
  showElement("modal","flex")
  hideElement("purchase-plan-form-submit");
  hideElement("purchase-plan-input");
  const purchaseFormData = new FormData(event.target);
  const phoneNumber = purchaseFormData.get("phone");
  const serverFormData = new FormData(document.getElementById("server-form"));
  const macAddress = serverFormData.get("mac");
  const ipAddress = serverFormData.get("ip");

  activatePlan(config.baseURL, phoneNumber, macAddress, ipAddress)
    .then((result) => {
      showElement("purchase-plan-form-close", "unset");
      hideElement("purchase-loader");
      if (result) {
        showElement("purchase-plan-success", "block");
      } else {
        showElement("purchase-plan-error", "block");
      }
    });
  }
}

function createPurchaseHandler(config) {
  return (event) => {
  event.preventDefault();
  showElement("purchase-loader", "flex");
  hideElement("purchase-plan-form-submit");
  hideElement("purchase-plan-input");

  const purchaseFormData = new FormData(event.target);
  const planId = purchaseFormData.get("plan_id");
  const phoneNumber = purchaseFormData.get("phone");
  const serverFormData = new FormData(document.getElementById("server-form"));
  const macAddress = serverFormData.get("mac");
  const ipAddress = serverFormData.get("ip");

  postPurchasePlan(config.baseURL, phoneNumber, macAddress, ipAddress, planId)
    .then((result) => {
      showElement("purchase-plan-form-close", "unset");
      if (result) {
        showElement("purchase-plan-success", "block");
      } else {
        showElement("purchase-plan-error", "block");
      }
      hideElement("purchase-loader");
    });
  }
}

// Set identity (title and description)
function setIdentity(title, description) {
  document.getElementById("site-title").textContent = title;
  document.getElementById("site-description").textContent = description;
}

// Initialization Functions

async function initializeConfig() {
  const config = await fetchConfig();
  setIdentity(config.title, config.description);
  return config;
}

async function initializePlans(config) {
  showElement("loader", "flex");
  const data = await fetchPlans(config.baseURL, config.router);
  hideElement("loader");

  if (data.success) {
    const itemsList = document.getElementById("items-list");
    data.result.forEach((plan) => {
      const listItem = createListItem(plan);
      itemsList.appendChild(listItem);
    });
  } else {
    console.error("Error fetching plans:", data.message);
  }
}

// Main Initialization

export async function initialize() {
  document.handlePurchaseClick = handlePurchaseClick;
  document.handleModalClose = handleModalClose;

  const modal = document.getElementById("modal");
  const closeModalBtn = document.getElementById("close-modal");

  closeModalBtn.addEventListener("click", handleModalClose);
  window.addEventListener("click", (event) => {
    if (event.target === modal) {
      handleModalClose();
    }
  });

  try {
    const config = await initializeConfig();
    document.getElementById("current-year").textContent = new Date().getFullYear();
    document.getElementById("purchase-plan-form").addEventListener("submit", createPurchaseHandler(config));
    document.getElementById("activate-form").addEventListener("submit", createActivateHandler(config));
    await initializePlans(config);
  } catch (error) {
    console.error("Initialization error:", error);
    hideElement("purchase-loader");
  }
}

document.addEventListener("DOMContentLoaded", initialize);
