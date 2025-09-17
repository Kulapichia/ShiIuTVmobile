import React, { useCallback, useRef, useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, BackHandler } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { getCommonResponsiveStyles } from "@/utils/ResponsiveStyles";
// 1. 核心变更：导入 FlashList
import { FlashList, ListRenderItem } from "@shopify/flash-list";

interface CustomScrollViewProps {
  data: any[];
  renderItem: ({ item, index }: { item: any; index: number }) => React.ReactNode;
  numColumns?: number; // 如果不提供，将使用响应式默认值
  loading?: boolean;
  loadingMore?: boolean;
  error?: string | null;
  onEndReached?: () => void;
  // 2. 移除 loadMoreThreshold 属性, 因为 FlashList 使用 onEndReachedThreshold
  emptyMessage?: string;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
}

const CustomScrollView: React.FC<CustomScrollViewProps> = ({
  data,
  renderItem,
  numColumns,
  loading = false,
  loadingMore = false,
  error = null,
  onEndReached,
  emptyMessage = "暂无内容",
  ListFooterComponent,
}) => {
  // 3. 将 ref 类型更改为 FlashList
  const listRef = useRef<FlashList<any>>(null);
  const firstCardRef = useRef<any>(null); // TV 聚焦 ref 保持不变
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const responsiveConfig = useResponsiveLayout();
  const commonStyles = getCommonResponsiveStyles(responsiveConfig);
  const { deviceType, cardWidth, cardHeight, spacing } = responsiveConfig;

  // 4. 返回键处理逻辑
  useEffect(() => {
    if (deviceType === 'tv') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (showScrollToTop) {
          scrollToTop();
          return true; // 阻止默认的返回行为
        }
        return false; // 允许默认的返回行为
      });

      return () => backHandler.remove();
    }
  }, [showScrollToTop, deviceType]);

  // 响应式列数逻辑
  const effectiveColumns = numColumns || responsiveConfig.columns;

  // 5. 简化 handleScroll，不再需要手动计算是否到底部
  const handleScroll = useCallback(
    ({ nativeEvent }: { nativeEvent: any }) => {
      setShowScrollToTop(nativeEvent.contentOffset.y > 200);
    },
    [setShowScrollToTop]
  );

  // 6. 更新 scrollToTop 以使用 FlashList 的 API
  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    // 滚动动画结束后聚焦第一个卡片逻辑
    setTimeout(() => {
      firstCardRef.current?.focus();
    }, 500);
  }, []);

  // 错误状态处理
  if (error) {
    return (
      <View style={commonStyles.center}>
        <ThemedText type="subtitle" style={{ padding: spacing }}>
          {error}
        </ThemedText>
      </View>
    );
  }

  // 7. 为 FlashList 准备一个稳定的 renderItem 回调，并在这里处理 firstCardRef
  const renderItemCallback: ListRenderItem<any> = useCallback(
    ({ item, index }) => {
      const isFirstItem = index === 0;
      return (
        <View
          // 仅为第一个项目附加 ref 以便聚焦
          ref={isFirstItem ? firstCardRef : null}
          style={{
            // FlashList 靠 item 自身样式来确定布局
            width: cardWidth,
            marginHorizontal: spacing / 2,
            marginBottom: spacing, // FlashList 在行之间不自动加间距，我们手动添加
          }}
        >
          {renderItem({ item, index })}
        </View>
      );
    },
    [renderItem, cardWidth, spacing]
  );
  
  // 8. 大幅简化动态样式，因为不再需要手动计算行布局
  const dynamicStyles = StyleSheet.create({
    listContent: {
      // FlashList 自动处理水平间距，我们只需设置垂直和外部水平 padding
      paddingHorizontal: spacing / 2,
      paddingTop: spacing,
    },
    scrollToTopButton: {
      position: 'absolute',
      right: spacing,
      bottom: spacing * 2,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      padding: spacing,
      borderRadius: spacing,
    },
  });

  // 9. 最终渲染，使用 FlashList 组件替换 ScrollView
  return (
    <View style={{ flex: 1 }}>
      <FlashList
        ref={listRef}
        data={data}
        renderItem={renderItemCallback}
        numColumns={effectiveColumns}
        keyExtractor={(item, index) => item.id?.toString() || item.key || `item-${index}`}
        contentContainerStyle={dynamicStyles.listContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={deviceType !== 'tv'}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.8} // 使用比例阈值
        // 10. 直接内联底部组件逻辑，替代 renderFooter 函数
        ListFooterComponent={ListFooterComponent || (loadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} size="large" /> : null)}
        // 关键性能优化：提供预估尺寸
        estimatedItemSize={cardHeight + spacing} 
        // 11. 使用 ListEmptyComponent 替代顶层 if 判断
        ListEmptyComponent={
          // 关键修正：在数据为空时，根据 loading 状态显示加载动画或空消息
          loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} size="large" />
          ) : (
            <View style={commonStyles.center}>
              <ThemedText>{emptyMessage}</ThemedText>
            </View>
          )
        }
      />
      {/* 返回顶部按钮逻辑，功能完全保留 (显示逻辑微调为条件渲染) */}
      {deviceType !== 'tv' && showScrollToTop && (
        <TouchableOpacity
          style={dynamicStyles.scrollToTopButton}
          onPress={scrollToTop}
          activeOpacity={0.8}
        >
          <ThemedText>⬆️</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default CustomScrollView;
