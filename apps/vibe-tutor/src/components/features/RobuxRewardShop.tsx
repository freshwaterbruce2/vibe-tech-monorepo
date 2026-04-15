import {
  Check,
  Coins,
  Crown,
  Lock,
  ShoppingCart,
} from 'lucide-react';
import { useRewardShop } from './useRewardShop';

interface RobuxRewardShopProps {
  userTokens: number;
  onSpendTokens: (amount: number, reason?: string) => void;
  onPurchaseComplete?: () => void;
  onClose?: () => void;
}

const RobuxRewardShop = ({
  userTokens,
  onSpendTokens,
  onPurchaseComplete,
  onClose,
}: RobuxRewardShopProps) => {
  const {
    selectedCategory, setSelectedCategory, ownedItems,
    showPurchaseAnimation, lastPurchasedItem, activeAvatar,
    shopItems, categories, handlePurchase, getFilteredItems,
    getPurchaseCount, handleEquipAvatar,
  } = useRewardShop({ userTokens, onSpendTokens, onPurchaseComplete });

  return (
    <div className="min-h-screen bg-[var(--background-main)] p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-8 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 md:w-10 md:h-10 shrink-0" />
              <span className="truncate">Robux Reward Shop</span>
            </h1>
            <p className="text-white/70 mt-2 text-sm md:text-base">Spend your hard-earned Robux on awesome rewards!</p>
          </div>

          <div className="flex flex-col sm:flex-row w-full md:w-auto items-stretch sm:items-center gap-4">
            {/* Balance Display */}
            <div className="bg-gray-800/50 backdrop-blur rounded-2xl px-6 py-4 flex-1">
              <div className="flex items-center justify-center sm:justify-start gap-3">
                <Coins className="w-8 h-8 text-[var(--token-color)] shrink-0" />
                <div className="text-white">
                  <div className="text-sm opacity-70">Your Balance</div>
                  <div className="text-2xl sm:text-3xl font-bold">{userTokens} Robux</div>
                </div>
              </div>
            </div>

            {/* Close Button */}
            {onClose && (
              <button
                onClick={onClose}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-4 sm:py-3 rounded-xl font-bold transition-all w-full sm:w-auto shrink-0"
              >
                Close Shop
              </button>
            )}
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-4 hide-scrollbar snap-x">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-5 py-2.5 rounded-full font-bold transition-all whitespace-nowrap shadow-sm snap-start shrink-0 flex items-center gap-2 ${
                selectedCategory === category.id
                  ? 'bg-gradient-to-r from-purple-500 to-sky-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] scale-105'
                  : 'bg-gray-800/50 text-gray-300 border border-gray-700 hover:bg-gray-700 border border-gray-700'
              }`}
            >
              <div className="shrink-0">{category.icon}</div>
              {category.name}
            </button>
          ))}
        </div>

        {/* My Items Inventory View */}
        {selectedCategory === 'my-items' ? (
          <div>
            {shopItems.filter((item) => ownedItems.has(item.id) || getPurchaseCount(item.id) > 0)
              .length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🛍️</div>
                <h3 className="text-2xl font-bold text-white mb-2">No Items Yet</h3>
                <p className="text-white/60">Purchase items from the shop to see them here!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {shopItems
                  .filter((item) => ownedItems.has(item.id) || getPurchaseCount(item.id) > 0)
                  .map((item) => {
                    const isAvatar = item.category === 'avatars';
                    const isEquipped = isAvatar && activeAvatar === item.id;
                    const purchaseCount = getPurchaseCount(item.id);

                    return (
                      <div
                        key={item.id}
                        className={`relative bg-gray-800/50 backdrop-blur rounded-3xl p-6 border-2 ${
                          isEquipped
                            ? 'border-[var(--token-color)]/70 shadow-[0_0_20px_rgba(251,191,36,0.2)]'
                            : 'border-[var(--secondary-accent)]/50'
                        } transition-all duration-300`}
                      >
                        {/* Badge */}
                        {isEquipped ? (
                          <div className="absolute top-4 right-4 bg-[var(--token-color)] text-black px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                            <Crown className="w-4 h-4" />
                            Active
                          </div>
                        ) : (
                          <div className="absolute top-4 right-4 bg-[var(--secondary-accent)] text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            Owned
                          </div>
                        )}

                        {/* Item Icon */}
                        <div
                          className={`bg-gradient-to-r ${item.color} w-20 h-20 rounded-2xl flex items-center justify-center text-white mb-4 mx-auto`}
                        >
                          {item.icon}
                        </div>

                        {/* Item Info */}
                        <h3 className="text-xl font-bold text-white mb-2 text-center">
                          {item.name}
                        </h3>
                        <p className="text-white/70 text-sm mb-4 text-center break-words">{item.description}</p>

                        {/* Quantity for consumables */}
                        {item.maxQuantity && (
                          <p className="text-center text-sm text-[var(--success-accent)] mb-3">
                            Redeemed {purchaseCount}x
                          </p>
                        )}

                        {/* Equip Button for Avatars */}
                        {isAvatar && (
                          <button
                            onClick={() => handleEquipAvatar(item.id)}
                            className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                              isEquipped
                                ? 'bg-[var(--token-color)]/20 border border-[var(--token-color)]/50 text-[var(--token-color)] hover:bg-[var(--token-color)]/30'
                                : 'bg-gradient-to-r from-purple-500 to-sky-500 text-white hover:scale-105'
                            }`}
                          >
                            {isEquipped ? 'Unequip' : 'Equip Avatar'}
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ) : (
          /* Shop Items Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {getFilteredItems().map((item) => {
              const isOwned = ownedItems.has(item.id);
              const purchaseCount = getPurchaseCount(item.id);
              const canPurchase =
                userTokens >= item.cost &&
                (!isOwned || (item.maxQuantity && purchaseCount < item.maxQuantity));

              return (
                <div
                  key={item.id}
                  className={`relative bg-gray-800/50 backdrop-blur rounded-3xl p-6 border-2
                    ${
                      isOwned && !item.maxQuantity
                        ? 'border-[var(--secondary-accent)]/50'
                        : canPurchase
                          ? 'border-[var(--primary-accent)]/50 hover:border-[var(--primary-accent)]'
                          : 'border-gray-700 opacity-60'
                    } transition-all duration-300`}
                >
                  {/* Owned Badge */}
                  {isOwned && !item.maxQuantity && (
                    <div className="absolute top-4 right-4 bg-[var(--secondary-accent)] text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Owned
                    </div>
                  )}

                  {/* Quantity Badge */}
                  {item.maxQuantity && (
                    <div className="absolute top-4 right-4 bg-[var(--success-accent)] text-[var(--background-main)] px-3 py-1 rounded-full text-sm font-bold">
                      {purchaseCount}/{item.maxQuantity}
                    </div>
                  )}

                  {/* Item Icon */}
                  <div
                    className={`bg-gradient-to-r ${item.color} w-20 h-20 rounded-2xl flex items-center justify-center text-white mb-4 mx-auto`}
                  >
                    {item.icon}
                  </div>

                  {/* Item Info */}
                  <h3 className="text-xl font-bold text-white mb-2 text-center">{item.name}</h3>
                  <p className="text-white/70 text-sm mb-4 text-center break-words">{item.description}</p>

                  {/* Price & Purchase Button */}
                  <div className="mt-auto">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Coins className="w-5 h-5 text-[var(--token-color)]" />
                      <span className="text-2xl font-bold text-[var(--token-color)]">{item.cost}</span>
                    </div>

                    <button
                      onClick={() => handlePurchase(item)}
                      disabled={!canPurchase}
                      className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2
                        ${
                          canPurchase
                            ? 'bg-gradient-to-r from-[var(--secondary-accent)] to-[var(--success-accent)] text-white hover:scale-105'
                            : isOwned && !item.maxQuantity
                              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                      {isOwned && !item.maxQuantity ? (
                        <>Already Owned</>
                      ) : userTokens < item.cost ? (
                        <>
                          <Lock className="w-5 h-5" />
                          Need {item.cost - userTokens} more
                        </>
                      ) : item.maxQuantity && purchaseCount >= item.maxQuantity ? (
                        <>Max Redeemed</>
                      ) : (
                        <>Purchase</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Purchase Animation */}
        {showPurchaseAnimation && lastPurchasedItem && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
            <div className="bg-gradient-to-r from-[var(--secondary-accent)] to-[var(--success-accent)] text-white px-8 py-6 rounded-3xl shadow-2xl animate-bounce max-w-sm w-full text-center">
              <div className="text-3xl font-bold mb-2">🎉 Success!</div>
              <div className="text-xl">Got: {lastPurchasedItem.name}</div>
              {lastPurchasedItem.category === 'real-rewards' && (
                <div className="mt-3 text-sm bg-black/20 rounded-lg p-2 text-[var(--text-primary)] font-medium">
                  Parent has been notified! ✉️
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="mt-12 bg-gray-800/30 backdrop-blur rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">💡 Shop Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white/80">
            <div>
              <p className="font-bold mb-1">📚 Study More</p>
              <p className="text-sm">Complete homework and games to earn more Robux!</p>
            </div>
            <div>
              <p className="font-bold mb-1">🎯 Save Up</p>
              <p className="text-sm">The best rewards cost more - save your Robux!</p>
            </div>
            <div>
              <p className="font-bold mb-1">🏆 Real Rewards</p>
              <p className="text-sm">
                Try examples like LEGO sets, family activity choice, or extra family time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RobuxRewardShop;
