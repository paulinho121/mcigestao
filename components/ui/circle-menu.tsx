import { motion, useAnimationControls, AnimatePresence } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { X, ArrowLeft } from 'lucide-react';

const ITEM_SIZE = 54;
const RADIUS = 135;
const OPEN_STAGGER = 0.04;
const CLOSE_STAGGER = 0.03;

const pointOnCircle = (i: number, n: number, r: number) => {
  const theta = (2 * Math.PI * i) / n - Math.PI / 2;
  return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
};

interface CircleMenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  index: number;
  totalItems: number;
  isOpen: boolean;
  colorClass: string;
}

const CircleMenuItemComponent = ({
  icon, label, onClick, index, totalItems, isOpen, colorClass
}: CircleMenuItemProps) => {
  const { x, y } = pointOnCircle(index, totalItems, RADIUS);

  return (
    <motion.button
      animate={{
        x: isOpen ? x : 0,
        y: isOpen ? y : 0,
        opacity: isOpen ? 1 : 0,
        scale: isOpen ? 1 : 0,
      }}
      transition={{
        delay: isOpen
          ? index * OPEN_STAGGER
          : (totalItems - 1 - index) * CLOSE_STAGGER,
        type: 'spring',
        stiffness: 300,
        damping: 26,
      }}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.92 }}
      style={{ width: ITEM_SIZE, height: ITEM_SIZE, position: 'absolute' }}
      className={`rounded-full flex items-center justify-center shadow-lg text-white cursor-pointer ${colorClass}`}
      onClick={onClick}
      aria-label={label}
    >
      {icon}
      <span
        className="absolute top-full mt-1.5 whitespace-nowrap pointer-events-none text-[10px] font-semibold tracking-wide text-white"
        style={{
          left: '50%',
          transform: 'translateX(-50%)',
          textShadow: '0 1px 6px rgba(0,0,0,0.85)',
        }}
      >
        {label}
      </span>
    </motion.button>
  );
};

export interface CircleMenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  colorClass: string;
  subItems?: CircleMenuItem[];
}

interface CircleMenuProps {
  items: CircleMenuItem[];
  onClose: () => void;
}

export const CircleMenu = ({ items, onClose }: CircleMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [displayItems, setDisplayItems] = useState<CircleMenuItem[]>(items);
  const [inSubMenu, setInSubMenu] = useState(false);
  const ringControls = useAnimationControls();

  useEffect(() => {
    const t = setTimeout(() => setIsOpen(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleClose = async () => {
    setIsOpen(false);
    await ringControls.start({
      rotate: -360,
      transition: { duration: CLOSE_STAGGER * (displayItems.length + 3), ease: 'linear' },
    });
    onClose();
  };

  const drillInto = (item: CircleMenuItem) => {
    if (item.subItems && item.subItems.length > 1) {
      const currentCount = displayItems.length;
      setIsOpen(false);
      setTimeout(() => {
        setDisplayItems(item.subItems!);
        setInSubMenu(true);
        setIsOpen(true);
      }, (currentCount * CLOSE_STAGGER + 0.15) * 1000);
    } else {
      item.onClick();
    }
  };

  const handleBack = () => {
    const currentCount = displayItems.length;
    setIsOpen(false);
    setTimeout(() => {
      setDisplayItems(items);
      setInSubMenu(false);
      setIsOpen(true);
    }, (currentCount * CLOSE_STAGGER + 0.15) * 1000);
  };

  const size = (RADIUS + ITEM_SIZE + 36) * 2;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Items ring */}
      <motion.div
        animate={ringControls}
        className="absolute inset-0 flex items-center justify-center"
        style={{ overflow: 'visible' }}
      >
        {displayItems.map((item, index) => (
          <CircleMenuItemComponent
            key={`${inSubMenu ? 'sub' : 'main'}-${index}`}
            icon={item.icon}
            label={item.label}
            onClick={() => drillInto(item)}
            index={index}
            totalItems={displayItems.length}
            isOpen={isOpen}
            colorClass={item.colorClass}
          />
        ))}
      </motion.div>

      {/* Center button — back when in sub-menu, close otherwise */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        style={{ width: 60, height: 60, zIndex: 10, position: 'relative' }}
        className="rounded-full bg-brand-600 hover:bg-brand-700 flex items-center justify-center shadow-2xl shadow-brand-900/40 text-white transition-colors"
        onClick={inSubMenu ? handleBack : handleClose}
        aria-label={inSubMenu ? 'Voltar' : 'Fechar menu'}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={inSubMenu ? 'back' : 'close'}
            initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
            transition={{ duration: 0.18 }}
          >
            {inSubMenu ? <ArrowLeft size={22} /> : <X size={22} />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  );
};
